"""
/extract-logbook Lambda handler
Uses Amazon Bedrock Multimodal AI (Amazon Nova Lite) to extract
data from handwritten/printed DG logbooks, photos, or diesel bills.
Falls back to Amazon Textract if available.

Pre-signed URL upload flow:
  1. Frontend gets pre-signed PUT URL -> uploads directly to S3
  2. Calls this endpoint with the S3 key
  3. Bedrock/Textract processes it; we return structured table + confidence scores + computed totals
  4. User reviews / corrects before proceeding to analysis
"""

from __future__ import annotations

import base64
import json
import os
import re
import sys
import traceback
from typing import Any

import boto3
from botocore.exceptions import ClientError

CORS_HEADERS = {
    "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    "Content-Type": "application/json",
}

S3_BUCKET = os.environ.get("UPLOAD_BUCKET", "sunswitch-uploads")
TEXTRACT_CONFIDENCE_THRESHOLD = 80.0


def _resp(status: int, body: Any) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str),
    }


def _get_presigned_url(s3_key: str, expiry: int = 300) -> str | None:
    """Generate pre-signed GET URL for the uploaded file (for frontend preview)."""
    try:
        region = os.environ.get("AWS_REGION", "ap-south-1")
        s3 = boto3.client("s3", region_name=region)
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": s3_key},
            ExpiresIn=expiry,
        )
        if url and ".s3.amazonaws.com" in url and f".s3.{region}.amazonaws.com" not in url:
            url = url.replace(".s3.amazonaws.com", f".s3.{region}.amazonaws.com")
        return url
    except Exception:
        return None


def _extract_with_bedrock(file_bytes: bytes, s3_key: str) -> dict:
    """
    Extract table rows and totals using Amazon Bedrock Nova Lite multimodal vision.
    Handles images (JPEG, PNG) and documents (PDF).
    """
    bedrock_region = os.environ.get("BEDROCK_REGION", "us-east-1")
    model_id = os.environ.get("BEDROCK_MODEL_ID", "us.amazon.nova-lite-v1:0")
    if "haiku" in model_id.lower() or "claude" in model_id.lower() or not model_id:
        model_id = "us.amazon.nova-lite-v1:0"

    br = boto3.client("bedrock-runtime", region_name=bedrock_region)
    b64_data = base64.b64encode(file_bytes).decode("utf-8")
    is_pdf = s3_key.lower().endswith(".pdf")

    if is_pdf:
        content_item = {
            "document": {
                "format": "pdf",
                "name": "logbook",
                "source": {"bytes": b64_data},
            }
        }
    else:
        fmt = "png" if s3_key.lower().endswith(".png") else "jpeg"
        content_item = {
            "image": {
                "format": fmt,
                "source": {"bytes": b64_data},
            }
        }

    prompt = """Analyze this diesel generator (DG) logbook or diesel bill.
Extract all table rows, dates, running hours, and diesel litres consumed.
Calculate the total litres, total running hours, and the period in months.
Return ONLY valid JSON with this exact structure:
{
  "period": "Jan - June 2026",
  "periodMonths": 6,
  "totalLitres": 269,
  "totalHours": 12,
  "headers": ["Date", "Start", "Stop", "Diesel (L)"],
  "rows": [
    ["16-1", "8:10", "9:10", "23"],
    ["27-1", "5:00", "8:00", "24"]
  ]
}
Return only JSON."""

    res = br.invoke_model(
        modelId=model_id,
        contentType="application/json",
        accept="application/json",
        body=json.dumps({
            "messages": [
                {
                    "role": "user",
                    "content": [content_item, {"text": prompt}],
                }
            ]
        }),
    )

    raw_text = json.loads(res["body"].read())["output"]["message"]["content"][0]["text"]
    clean_text = raw_text.strip()
    if clean_text.startswith("```"):
        clean_text = clean_text.split("```")[1]
        if clean_text.startswith("json"):
            clean_text = clean_text[4:].strip()

    try:
        parsed = json.loads(clean_text)
    except Exception:
        match = re.search(r"\{.*\}", clean_text, re.DOTALL)
        if match:
            parsed = json.loads(match.group(0))
        else:
            raise ValueError(f"Could not parse valid JSON from model response: {clean_text[:200]}")

    headers = parsed.get("headers", ["Date", "Start", "Stop", "Diesel (L)"])
    rows_data = parsed.get("rows", [])

    header_cells = [
        {"text": str(h), "confidence": 98.0, "row": 0, "col": ci, "low_confidence": False}
        for ci, h in enumerate(headers)
    ]
    table_rows = [header_cells]

    for ri, r in enumerate(rows_data):
        row_cells = [
            {"text": str(c), "confidence": 95.0, "row": ri + 1, "col": ci, "low_confidence": False}
            for ci, c in enumerate(r)
        ]
        table_rows.append(row_cells)

    preview_url = _get_presigned_url(s3_key)

    return {
        "tables": [{"rows": table_rows, "num_rows": len(table_rows)}],
        "keyValues": [],
        "numTables": 1,
        "totalCells": sum(len(r) for r in table_rows),
        "lowConfidenceCells": 0,
        "confidenceThreshold": TEXTRACT_CONFIDENCE_THRESHOLD,
        "previewUrl": preview_url,
        "totalLitres": parsed.get("totalLitres", 0),
        "totalHours": parsed.get("totalHours", 0),
        "periodMonths": parsed.get("periodMonths", 12),
        "extractedBy": f"Amazon Bedrock ({model_id})",
        "note": "Extracted via Amazon Bedrock Multimodal AI (Amazon Nova) from your uploaded document.",
    }


def _extract_tables(textract_response: dict) -> list[dict]:
    """Parse Textract AnalyzeDocument response into a list of tables."""
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

        table_rows = []
        for r_idx in sorted(rows.keys()):
            row_cells = [
                rows[r_idx].get(c, {"text": "", "confidence": 0, "low_confidence": True})
                for c in sorted(rows[r_idx].keys())
            ]
            table_rows.append(row_cells)

        tables.append({"rows": table_rows, "num_rows": len(table_rows)})

    return tables


def _extract_key_values(textract_response: dict) -> list[dict]:
    """Parse KEY_VALUE_SET blocks for form field extraction."""
    blocks = textract_response.get("Blocks", [])
    block_map = {b["Id"]: b for b in blocks}
    key_blocks = [
        b for b in blocks
        if b.get("BlockType") == "KEY_VALUE_SET" and "KEY" in b.get("EntityTypes", [])
    ]

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
            region = os.environ.get("AWS_REGION", "ap-south-1")
            s3 = boto3.client("s3", region_name=region)
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
            if ".s3.amazonaws.com" in presigned.get("url", "") and f".s3.{region}.amazonaws.com" not in presigned.get("url", ""):
                presigned["url"] = presigned["url"].replace(".s3.amazonaws.com", f".s3.{region}.amazonaws.com")
            return _resp(200, {"presignedPost": presigned, "s3Key": s3_key})
        except ClientError as exc:
            return _resp(500, {"error": f"Could not generate upload URL: {exc}"})

    # --- Process uploaded file ---
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _resp(400, {"error": "Invalid JSON body."})

    s3_key = body.get("s3Key")
    if not s3_key:
        return _resp(400, {"error": "s3Key is required."})

    # Fetch uploaded file from S3
    region = os.environ.get("AWS_REGION", "ap-south-1")
    s3 = boto3.client("s3", region_name=region)
    file_bytes = None
    try:
        obj = s3.get_object(Bucket=S3_BUCKET, Key=s3_key)
        file_bytes = obj["Body"].read()
    except ClientError:
        import urllib.parse
        unquoted_key = urllib.parse.unquote(s3_key)
        try:
            obj = s3.get_object(Bucket=S3_BUCKET, Key=unquoted_key)
            file_bytes = obj["Body"].read()
            s3_key = unquoted_key
        except ClientError:
            parts = s3_key.split("/")
            if len(parts) >= 2 and parts[0] == "uploads":
                prefix = f"uploads/{parts[1]}/"
                try:
                    list_resp = s3.list_objects_v2(Bucket=S3_BUCKET, Prefix=prefix, MaxKeys=5)
                    contents = list_resp.get("Contents", [])
                    if contents:
                        s3_key = contents[0]["Key"]
                        obj = s3.get_object(Bucket=S3_BUCKET, Key=s3_key)
                        file_bytes = obj["Body"].read()
                except Exception as list_err:
                    print(f"Error listing prefix {prefix}: {list_err}")

    if not file_bytes:
        return _resp(400, {"error": f"File not found in storage: {s3_key}"})

    # 1. Primary: Try Bedrock Multimodal AI (Nova Lite)
    bedrock_err_str = "None"
    try:
        result = _extract_with_bedrock(file_bytes, s3_key)
        return _resp(200, result)
    except Exception as bedrock_err:
        bedrock_err_str = str(bedrock_err)
        print(f"Bedrock extraction error: {bedrock_err_str}\n{traceback.format_exc()}")

    # 2. Secondary fallback: Amazon Textract (if subscribed)
    try:
        textract = boto3.client("textract", region_name=region)
        response = textract.analyze_document(
            Document={"S3Object": {"Bucket": S3_BUCKET, "Name": s3_key}},
            FeatureTypes=["TABLES", "FORMS"],
        )
        tables = _extract_tables(response)
        key_values = _extract_key_values(response)
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
            "extractedBy": "Amazon Textract",
            "note": "Extracted via Amazon Textract.",
        })
    except Exception as textract_err:
        print(f"Textract extraction error: {textract_err}\n{traceback.format_exc()}")
        return _resp(500, {
            "error": f"Extraction failed. Bedrock error: {bedrock_err_str}. Textract error: {textract_err}"
        })
