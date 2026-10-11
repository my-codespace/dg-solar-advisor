"""
/report Lambda handler
POST /report  – Save a report to DynamoDB, return unique ID
GET  /report/{id} – Fetch a saved report by ID
"""

from __future__ import annotations

import json
import os
import time
import uuid
from typing import Any

import boto3
from botocore.exceptions import ClientError

CORS_HEADERS = {
    "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
    "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
    "Content-Type": "application/json",
}

TABLE_NAME = os.environ.get("REPORTS_TABLE", "sunswitch-reports")
TTL_DAYS = int(os.environ.get("REPORT_TTL_DAYS", "90"))
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "us.amazon.nova-lite-v1:0")
if "haiku" in BEDROCK_MODEL_ID.lower() or not BEDROCK_MODEL_ID:
    BEDROCK_MODEL_ID = "us.amazon.nova-lite-v1:0"


from decimal import Decimal

def _floats_to_decimals(obj: Any) -> Any:
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: _floats_to_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_floats_to_decimals(v) for v in obj]
    return obj


def _decimals_to_floats(obj: Any) -> Any:
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: _decimals_to_floats(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_decimals_to_floats(v) for v in obj]
    return obj


def _resp(status: int, body: Any) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str),
    }


def _dynamo():
    return boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "ap-south-1"))


def _generate_summary(results: dict, lang: str = "en") -> str:
    """
    Generate plain-language summary using Amazon Bedrock Claude.
    Falls back to a deterministic template if Bedrock is unavailable.
    """
    try:
        bedrock = boto3.client("bedrock-runtime", region_name=os.environ.get("BEDROCK_REGION", "us-east-1"))

        soc = results.get("societyName", "Your Society")
        dg = results.get("dg", {})
        fin = results.get("financials", {})
        solar = results.get("solar", {})

        if lang == "hi":
            prompt = f"""आप एक सरल भाषा में लिखने वाले विशेषज्ञ हैं। नीचे दिए गए डेटा के आधार पर,
{soc} के RWA कमेटी के लिए एक 150 शब्दों का सारांश हिंदी में लिखें।
डेटा:
- DG लागत प्रति यूनिट: ₹{dg.get('cost_per_kwh_rs', 'N/A')}
- वार्षिक DG खर्च: ₹{dg.get('annual_cost_rs', 'N/A'):,}
- DG से CO2: {dg.get('co2_kg', 'N/A')} किग्रा/वर्ष
- सौर ऊर्जा पहले वर्ष: {solar.get('year1_kwh', 'N/A')} kWh
- नेट इंस्टॉलेशन लागत (सब्सिडी के बाद): ₹{fin.get('net_installation_cost_rs', 'N/A'):,}
- भुगतान वापसी अवधि: {fin.get('payback_years', 'N/A')} वर्ष
- 25 वर्षों में बचत: ₹{fin.get('year25_savings_rs', 'N/A'):,}
- टाला गया CO2 (25 वर्ष): {fin.get('co2_avoided_25yr_tonnes', 'N/A')} टन

सरल, स्पष्ट हिंदी में लिखें जो एक गैर-तकनीकी RWA अध्यक्ष समझ सके।"""
        else:
            prompt = f"""You are a plain-language writing expert. Based on the data below,
write a 150-word summary for the RWA committee of {soc}.
Data:
- DG cost per unit: ₹{dg.get('cost_per_kwh_rs', 'N/A')}
- Annual DG spend: ₹{dg.get('annual_cost_rs', 0):,.0f}
- DG CO2 emissions: {dg.get('co2_kg', 'N/A')} kg/yr
- Solar year-1 generation: {solar.get('year1_kwh', 'N/A')} kWh
- Net installation cost (after subsidy): ₹{fin.get('net_installation_cost_rs', 0):,.0f}
- Payback period: {fin.get('payback_years', 'N/A')} years
- 25-year savings: ₹{fin.get('year25_savings_rs', 0):,.0f}
- CO2 avoided (25 yr): {fin.get('co2_avoided_25yr_tonnes', 'N/A')} tonnes

Write in clear, simple language that a non-technical RWA treasurer can understand and present at a committee meeting."""

        if "nova" in BEDROCK_MODEL_ID:
            body_payload = {
                "messages": [{"role": "user", "content": [{"text": prompt}]}]
            }
            response = bedrock.invoke_model(
                modelId=BEDROCK_MODEL_ID,
                body=json.dumps(body_payload),
                contentType="application/json",
                accept="application/json",
            )
            resp_body = json.loads(response["body"].read())
            return resp_body["output"]["message"]["content"][0]["text"]
        else:
            body_payload = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 400,
                "messages": [{"role": "user", "content": prompt}],
            }
            response = bedrock.invoke_model(
                modelId=BEDROCK_MODEL_ID,
                body=json.dumps(body_payload),
                contentType="application/json",
                accept="application/json",
            )
            resp_body = json.loads(response["body"].read())
            return resp_body["content"][0]["text"]

    except Exception as exc:
        # Deterministic fallback — clearly labeled
        print(f"Bedrock unavailable ({exc}), using template fallback.")
        return _template_summary(results, lang)


def _template_summary(results: dict, lang: str = "en") -> str:
    """Deterministic template fallback when Bedrock is unavailable."""
    soc = results.get("societyName", "Your Society")
    dg = results.get("dg", {})
    fin = results.get("financials", {})
    solar = results.get("solar", {})

    if lang == "hi":
        return (
            f"[स्वचालित टेम्पलेट – AI उपलब्ध नहीं]\n\n"
            f"{soc} वर्तमान में डीजल जनरेटर पर ₹{dg.get('cost_per_kwh_rs', 'N/A')} प्रति यूनिट "
            f"खर्च कर रही है, जो ग्रिड बिजली से काफी महंगा है। "
            f"सालाना कुल DG खर्च लगभग ₹{dg.get('annual_cost_rs', 0):,.0f} है। "
            f"सौर ऊर्जा स्थापित करने के बाद (सब्सिडी काटकर) ₹{fin.get('net_installation_cost_rs', 0):,.0f} का निवेश होगा "
            f"जो लगभग {fin.get('payback_years', 'N/A')} वर्षों में वापस आ जाएगा। "
            f"25 वर्षों में कुल बचत ₹{fin.get('year25_savings_rs', 0):,.0f} और "
            f"{fin.get('co2_avoided_25yr_tonnes', 'N/A')} टन CO2 बचाई जा सकती है।"
        )
    return (
        "[Auto-generated template – AI summary unavailable]\n\n"
        f"{soc} currently pays ₹{dg.get('cost_per_kwh_rs', 'N/A')}/kWh for DG power — "
        f"far above the grid tariff — amounting to roughly ₹{dg.get('annual_cost_rs', 0):,.0f}/year. "
        f"Switching to rooftop solar requires a net investment of "
        f"₹{fin.get('net_installation_cost_rs', 0):,.0f} (after PM Surya Ghar subsidy), "
        f"with a payback period of approximately {fin.get('payback_years', 'N/A')} years. "
        f"Over 25 years, the society could save ₹{fin.get('year25_savings_rs', 0):,.0f} "
        f"and avoid {fin.get('co2_avoided_25yr_tonnes', 'N/A')} tonnes of CO₂."
    )


def handler(event: dict, context: Any) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return _resp(200, {})

    method = event.get("httpMethod", "GET")
    path_params = event.get("pathParameters") or {}
    report_id = path_params.get("id")

    # --- GET /report/{id} ---
    if method == "GET":
        if not report_id:
            return _resp(400, {"error": "Report ID is required."})
        try:
            table = _dynamo().Table(TABLE_NAME)
            resp = table.get_item(Key={"id": report_id})
            item = resp.get("Item")
            if not item:
                return _resp(404, {"error": f"Report '{report_id}' not found."})
            res_item = _decimals_to_floats(item)
            results = res_item.get("results") or {}
            merged = {
                **results,
                "results": results,
                "id": res_item.get("id"),
                "summaryEn": res_item.get("summaryEn"),
                "summaryHi": res_item.get("summaryHi"),
                "createdAt": res_item.get("createdAt"),
            }
            return _resp(200, merged)
        except ClientError as exc:
            return _resp(500, {"error": f"Database error: {exc}"})

    # --- POST /report ---
    if method == "POST":
        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            return _resp(400, {"error": "Invalid JSON body."})

        results = body.get("results")
        if not results:
            return _resp(400, {"error": "results field is required."})

        lang = body.get("lang", "en")

        new_id = str(uuid.uuid4())[:8]
        now = int(time.time())
        ttl = now + (TTL_DAYS * 86400)

        # Generate AI summary
        summary_en = _generate_summary(results, "en")
        summary_hi = _generate_summary(results, "hi")

        item = {
            "id": new_id,
            "results": results,
            "summaryEn": summary_en,
            "summaryHi": summary_hi,
            "createdAt": now,
            "ttl": ttl,
        }

        try:
            table = _dynamo().Table(TABLE_NAME)
            table.put_item(Item=_floats_to_decimals(item))
        except ClientError as exc:
            return _resp(500, {"error": f"Could not save report: {exc}"})

        return _resp(200, {
            "id": new_id,
            "reportUrl": f"/report/{new_id}",
            "summaryEn": summary_en,
            "summaryHi": summary_hi,
            "createdAt": now,
        })

    return _resp(405, {"error": f"Method {method} not allowed."})
