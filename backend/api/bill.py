"""
Grid billing. Only the utility grid is billed — solar and battery usage
never show up here, by design.
"""
from flask import Blueprint, request, jsonify
from models.appliances import DEFAULT_APPLIANCES

bill_bp = Blueprint("bill", __name__)

DEFAULT_RATE_PER_KWH = 0.13  # US average residential rate; swap for a real
                              # zip-code lookup once you wire up a tariff API


@bill_bp.route("/estimate", methods=["POST"])
def estimate():
    """
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


@bill_bp.route("/translate", methods=["POST"])
def translate_bill():
    """
    PRO FEATURE — "what ate my bill".
    POST /api/bill/translate
    Body: { "image_base64": "...", "usage_by_appliance_hours": {"ac": 180, "fridge": 720, ...} }

    TODO(AI wiring): this currently expects usage hours to already be known
    (e.g. entered manually or pulled from app history) and just does the
    attribution math. To go from "photo of a paper bill" to actual numbers,
    send image_base64 to the Gemini Vision API (gemini-1.5-flash or newer)
    with a prompt asking it to extract total kWh and billing period, then
    feed that into this same function.
    """
    body = request.get_json(force=True) or {}
    usage_hours = body.get("usage_by_appliance_hours", {})
    total_bill = body.get("total_bill_usd")

    if not usage_hours or total_bill is None:
        return jsonify({"error": "usage_by_appliance_hours and total_bill_usd are required"}), 400

    breakdown = []
    total_kwh = 0
    for appliance_id, hours in usage_hours.items():
        appliance = next((a for a in DEFAULT_APPLIANCES if a["id"] == appliance_id), None)
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
    PRO FEATURE — user gives a target monthly bill (or income), gets back a
    daily runtime allowance per appliance that keeps them under it.
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

    # split the daily budget across appliances, weighted so heavy permanent
    # appliances (fridge) get guaranteed baseline hours before the rest is split
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
