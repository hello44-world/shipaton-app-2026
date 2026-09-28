"""
Grid billing. Only the utility grid is billed — solar and battery usage
never show up here, by design.

Two tiers:
- /estimate — FREE, simple: units you already know x rate = estimated bill.
- /scan + /analyze — the ADVANCED tier: photograph the actual bill, WattGuard
  reads it, compares it against your bill history, and gives an honest
  explanation of why it moved — not just a number.
"""
import base64
import json
from flask import Blueprint, request, jsonify
from google.genai import types
from models.appliances import DEFAULT_APPLIANCES, get_appliance
from models.bill_history import get_history, add_entry
from services.gemini_client import get_gemini_client, MODEL_NAME

bill_bp = Blueprint("bill", __name__)

DEFAULT_RATE_PER_KWH = 0.13  # US average residential rate; swap for a real
                              # zip-code lookup once you wire up a tariff API


@bill_bp.route("/estimate", methods=["POST"])
def estimate():
    """
    FREE — simple estimate from units you already know.
    POST /api/bill/estimate
    Body: { "units_kwh": 350, "rate_per_kwh": 0.13 }   # rate optional
    """
    body = request.get_json(force=True) or {}
    units = body.get("units_kwh")
    if units is None:
        return jsonify({"error": "units_kwh is required"}), 400

    rate = body.get("rate_per_kwh") or DEFAULT_RATE_PER_KWH
    return jsonify({
        "units_kwh": units,
        "rate_per_kwh": rate,
        "estimated_bill_usd": round(units * rate, 2),
    })


@bill_bp.route("/scan", methods=["POST"])
def scan_bill_photo():
    """
    ADVANCED — step 1: photo -> numbers.
    Takes a photo of the actual bill and uses Gemini's vision model to pull
    out the numbers WattGuard needs. The mobile app shows these back to the
    user to confirm/edit before they're saved — OCR isn't perfect, never
    silently trust it.

    POST /api/bill/scan
    Body: { "image_base64": "..." }
    """
    body = request.get_json(force=True) or {}
    image_b64 = body.get("image_base64")
    if not image_b64:
        return jsonify({"error": "image_base64 is required"}), 400

    prompt = (
        "This is a photo of an electricity bill. Read it and return ONLY a "
        "JSON object, no other text, no markdown fences, in exactly this shape: "
        '{"units_kwh": <number or null>, "total_amount_usd": <number or null>, '
        '"billing_period": "<string or null>"}. '
        "If a field isn't clearly readable, use null for it rather than guessing."
    )

    try:
        client = get_gemini_client()
        image_bytes = base64.b64decode(image_b64)
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                prompt,
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
            ],
        )
        raw = (response.text or "").strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        extracted = json.loads(raw)
    except Exception as e:
        return jsonify({"error": f"couldn't read the bill photo: {e}"}), 502

    return jsonify(extracted)


@bill_bp.route("/analyze", methods=["POST"])
def analyze_bill():
    """
    ADVANCED — step 2: numbers -> an honest explanation.
    Revises bill history to explain why the bill moved, not just report a
    number. Saves this period to history for next time.

    POST /api/bill/analyze
    Body: {
      "units_kwh": 410,
      "total_amount_usd": 53.30,          # optional — estimated from units_kwh if omitted
      "usage_by_appliance_hours": {...}   # optional — if given, names the actual biggest contributor
    }
    """
    body = request.get_json(force=True) or {}
    units = body.get("units_kwh")
    if units is None:
        return jsonify({"error": "units_kwh is required"}), 400

    rate = body.get("rate_per_kwh") or DEFAULT_RATE_PER_KWH
    total_amount = body.get("total_amount_usd")
    if total_amount is None:
        total_amount = round(units * rate, 2)

    usage_hours = body.get("usage_by_appliance_hours") or {}

    history = get_history()
    previous = history[-1] if history else None

    explanation_parts = []
    if previous:
        prev_units = previous.get("units_kwh", 0)
        diff = units - prev_units
        pct = (diff / prev_units * 100) if prev_units else 0

        if diff > 0:
            explanation_parts.append(
                f"According to your data, this bill is ${total_amount} — that's {abs(round(pct))}% "
                f"higher than your last logged period ({prev_units} kWh vs {units} kWh now)."
            )
        elif diff < 0:
            explanation_parts.append(
                f"According to your data, this bill is ${total_amount} — that's {abs(round(pct))}% "
                f"lower than your last logged period. Good progress."
            )
        else:
            explanation_parts.append(
                f"According to your data, this bill is ${total_amount} — about the same as last time."
            )

        # Only name a SPECIFIC appliance cause if we actually have appliance-level
        # data — otherwise this would be a guess dressed up as a fact.
        if diff > 0 and usage_hours:
            biggest = _biggest_contributor(usage_hours)
            if biggest:
                explanation_parts.append(
                    f"Your {biggest['name']} usage ({biggest['hours']} hrs) is the largest single "
                    f"contributor this period — that's the most likely driver of the increase."
                )
        elif diff > 0:
            explanation_parts.append(
                "The most common causes: running heavy appliances (AC, washing machine, iron) on "
                "the grid during hours solar could have covered, or the grid staying active when "
                "conditions were actually good for solar. Log appliance hours next time for an exact breakdown."
            )
    else:
        explanation_parts.append(
            f"According to your data, this bill is ${total_amount}. This is your first logged bill, "
            f"so there's nothing to compare it to yet — next time you log one, WattGuard will tell you "
            f"exactly what changed."
        )

    add_entry(units, total_amount, usage_hours)

    return jsonify({
        "units_kwh": units,
        "total_amount_usd": total_amount,
        "previous_units_kwh": previous.get("units_kwh") if previous else None,
        "explanation": " ".join(explanation_parts),
    })


def _biggest_contributor(usage_hours):
    best = None
    for appliance_id, hours in usage_hours.items():
        appliance = get_appliance(appliance_id)
        if not appliance:
            continue
        kwh = (appliance["watts"] * hours) / 1000
        if best is None or kwh > best["kwh"]:
            best = {"id": appliance_id, "name": appliance["name"], "hours": hours, "kwh": round(kwh, 2)}
    return best


@bill_bp.route("/translate", methods=["POST"])
def translate_bill():
    """
    "What ate my bill" — attribution math for hours you already know.
    POST /api/bill/translate
    Body: { "usage_by_appliance_hours": {"ac": 180, "fridge": 720, ...}, "total_bill_usd": 53.30 }
    """
    body = request.get_json(force=True) or {}
    usage_hours = body.get("usage_by_appliance_hours", {})
    total_bill = body.get("total_bill_usd")

    if not usage_hours or total_bill is None:
        return jsonify({"error": "usage_by_appliance_hours and total_bill_usd are required"}), 400

    breakdown = []
    total_kwh = 0
    for appliance_id, hours in usage_hours.items():
        appliance = get_appliance(appliance_id)
        if not appliance:
            continue
        kwh = (appliance["watts"] * hours) / 1000
        total_kwh += kwh
        breakdown.append({"id": appliance_id, "name": appliance["name"], "kwh": round(kwh, 2)})

    for item in breakdown:
        share = (item["kwh"] / total_kwh) if total_kwh else 0
        item["share_pct"] = round(share * 100, 1)
        item["cost_usd"] = round(share * total_bill, 2)

    breakdown.sort(key=lambda x: x["kwh"], reverse=True)
    top = breakdown[0] if breakdown else None

    return jsonify({
        "breakdown": breakdown,
        "summary": f"{top['name']} accounted for {top['share_pct']}% of your bill." if top else "No usage data.",
    })


@bill_bp.route("/budget-optimizer", methods=["POST"])
def budget_optimizer():
    """
    User gives a target monthly bill (or income), gets back a daily runtime
    allowance per appliance that keeps them under it.
    POST /api/bill/budget-optimizer
    Body: { "target_bill_usd": 40, "rate_per_kwh": 0.13, "days_in_month": 30 }
    """
    body = request.get_json(force=True) or {}
    target_bill = body.get("target_bill_usd")
    if target_bill is None:
        return jsonify({"error": "target_bill_usd is required"}), 400

    rate = body.get("rate_per_kwh") or DEFAULT_RATE_PER_KWH
    days = body.get("days_in_month") or 30

    total_kwh_budget = target_bill / rate
    daily_kwh_budget = total_kwh_budget / days

    total_watts = sum(a["watts"] for a in DEFAULT_APPLIANCES)
    schedule = []
    for appliance in DEFAULT_APPLIANCES:
        weight = appliance["watts"] / total_watts
        allotted_kwh = daily_kwh_budget * weight
        max_hours = (allotted_kwh * 1000) / appliance["watts"] if appliance["watts"] else 0
        schedule.append({
            "id": appliance["id"],
            "name": appliance["name"],
            "max_hours_per_day": round(max_hours, 1),
        })

    return jsonify({
        "target_bill_usd": target_bill,
        "daily_kwh_budget": round(daily_kwh_budget, 2),
        "schedule": schedule,
    })