"""
/extract-logbook Lambda handler
Uses Amazon Textract AnalyzeDocument (TABLES + FORMS) to extract
data from DG logbook photos or diesel bill uploads.

Pre-signed URL upload flow:
  1. Frontend gets pre-signed PUT URL → uploads directly to S3
  2. Calls this endpoint with the S3 key
  3. Textract processes it; we return structured table + confidence scores
  4. User reviews / corrects before proceeding to analysis
"""

from __future__ import annotations

import json
import os
import sys
import traceback
from typing import Any

import boto3
from botocore.exceptions import ClientError

CORS_HEADERS = {
    "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Content-Type": "application/json",
}

S3_BUCKET = os.environ.get("UPLOAD_BUCKET", "sunswitch-uploads")
TEXTRACT_CONFIDENCE_THRESHOLD = 80.0  # cells below this are flagged for review


def _resp(status: int, body: Any) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str),
    }


def _extract_tables(textract_response: dict) -> list[dict]:
    """
    Parse Textract AnalyzeDocument response into a list of tables.
    Each table is a dict with 'rows' (list of lists of cell dicts).
    Cell dict: {text, confidence, row, col, low_confidence}
    """
    blocks = textract_response.get("Blocks", [])
    block_map = {b["Id"]: b for b in blocks}

    tables = []
    for block in blocks:
        if block["BlockType"] != "TABLE":
            continue

        rows: dict[int, dict[int, dict]] = {}
        for rel in block.get("Relationships", []):
            if rel["Type"] != "CHILD":
                continue
            for cell_id in rel["Ids"]:
                cell = block_map.get(cell_id, {})
                if cell.get("BlockType") != "CELL":
                    continue
                row_idx = cell.get("RowIndex", 0)
                col_idx = cell.get("ColumnIndex", 0)
                confidence = cell.get("Confidence", 0)

                # Get cell text from its WORD children
                cell_text = ""
                for child_rel in cell.get("Relationships", []):
                    if child_rel["Type"] == "CHILD":
                        for word_id in child_rel["Ids"]:
                            word = block_map.get(word_id, {})
                            if word.get("BlockType") in ("WORD", "SELECTION_ELEMENT"):
                                cell_text += word.get("Text", "") + " "

                rows.setdefault(row_idx, {})[col_idx] = {
                    "text": cell_text.strip(),
                    "confidence": round(confidence, 1),
                    "row": row_idx,
                    "col": col_idx,
                    "low_confidence": confidence < TEXTRACT_CONFIDENCE_THRESHOLD,
                }

        # Convert to sorted row lists
        table_rows = []
        for r_idx in sorted(rows.keys()):
            row_cells = [rows[r_idx].get(c, {"text": "", "confidence": 0, "low_confidence": True})
                         for c in sorted(rows[r_idx].keys())]
            table_rows.append(row_cells)

        tables.append({"rows": table_rows, "num_rows": len(table_rows)})

    return tables


def _extract_key_values(textract_response: dict) -> list[dict]:
    """
    Parse KEY_VALUE_SET blocks for form field extraction.
    Returns list of {key, value, key_confidence, value_confidence, low_confidence}.
    """
    blocks = textract_response.get("Blocks", [])
    block_map = {b["Id"]: b for b in blocks}
    key_blocks = [b for b in blocks if b.get("BlockType") == "KEY_VALUE_SET"
                  and "KEY" in b.get("EntityTypes", [])]

    results = []
    for key_block in key_blocks:
        key_text = _get_text_from_block(key_block, block_map)
        key_conf = key_block.get("Confidence", 0)

        value_text = ""
        value_conf = 0
        for rel in key_block.get("Relationships", []):
            if rel["Type"] == "VALUE":
                for vid in rel["Ids"]:
                    vblock = block_map.get(vid, {})
                    value_text = _get_text_from_block(vblock, block_map)
                    value_conf = vblock.get("Confidence", 0)

        if key_text:
            results.append({
                "key": key_text.strip(),
                "value": value_text.strip(),
                "key_confidence": round(key_conf, 1),
                "value_confidence": round(value_conf, 1),
                "low_confidence": min(key_conf, value_conf) < TEXTRACT_CONFIDENCE_THRESHOLD,
            })
    return results


def _get_text_from_block(block: dict, block_map: dict) -> str:
    text = ""
    for rel in block.get("Relationships", []):
        if rel["Type"] == "CHILD":
            for wid in rel["Ids"]:
                w = block_map.get(wid, {})
                if w.get("BlockType") == "WORD":
                    text += w.get("Text", "") + " "
    return text


def _get_presigned_url(s3_key: str, expiry: int = 300) -> str | None:
    """Generate pre-signed GET URL for the uploaded file (for frontend preview)."""
    try:
        s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
        return s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": s3_key},
            ExpiresIn=expiry,
        )
    except Exception:
        return None


def handler(event: dict, context: Any) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return _resp(200, {})

    # --- Handle pre-signed URL generation (GET /extract-logbook?action=presign) ---
    qs = event.get("queryStringParameters") or {}
    if qs.get("action") == "presign":
        filename = qs.get("filename", "upload.jpg")
        content_type = qs.get("contentType", "image/jpeg")
        import uuid
        s3_key = f"uploads/{uuid.uuid4()}/{filename}"
        try:
            s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
            presigned = s3.generate_presigned_post(
                Bucket=S3_BUCKET,
                Key=s3_key,
                Fields={"Content-Type": content_type},
                Conditions=[
                    {"Content-Type": content_type},
                    ["content-length-range", 1, 20 * 1024 * 1024],  # max 20 MB
                ],
                ExpiresIn=600,
            )
            return _resp(200, {"presignedPost": presigned, "s3Key": s3_key})
        except ClientError as exc:
            return _resp(500, {"error": f"Could not generate upload URL: {exc}"})

    # --- Process uploaded file with Textract ---
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _resp(400, {"error": "Invalid JSON body."})

    s3_key = body.get("s3Key")
    if not s3_key:
        return _resp(400, {"error": "s3Key is required."})

    try:
        textract = boto3.client("textract", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
        response = textract.analyze_document(
            Document={"S3Object": {"Bucket": S3_BUCKET, "Name": s3_key}},
            FeatureTypes=["TABLES", "FORMS"],
        )
    except ClientError as exc:
        err_code = exc.response["Error"]["Code"]
        if err_code in ("InvalidS3ObjectException", "NoSuchKey"):
            return _resp(400, {"error": f"File not found in storage: {s3_key}"})
        if err_code == "UnsupportedDocumentException":
            return _resp(400, {"error": "Unsupported file format. Please upload JPG, PNG, or PDF."})
        return _resp(500, {"error": f"Textract error: {err_code} – {exc}"})

    tables = _extract_tables(response)
    key_values = _extract_key_values(response)

    # Count low-confidence cells
    low_conf_count = sum(
        1 for t in tables for row in t["rows"] for cell in row if cell.get("low_confidence")
    )
    total_cells = sum(len(row) for t in tables for row in t["rows"])

    preview_url = _get_presigned_url(s3_key)

    return _resp(200, {
        "tables": tables,
        "keyValues": key_values,
        "numTables": len(tables),
        "totalCells": total_cells,
        "lowConfidenceCells": low_conf_count,
        "confidenceThreshold": TEXTRACT_CONFIDENCE_THRESHOLD,
        "previewUrl": preview_url,
        "note": (
            "Cells highlighted in red have confidence below "
            f"{TEXTRACT_CONFIDENCE_THRESHOLD}% and should be reviewed before continuing."
        ),
    })
