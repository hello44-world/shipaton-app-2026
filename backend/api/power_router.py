"""
Power source routing — decides whether the home is (or should be) running
on Solar, the Utility Grid, or Battery, based on live weather plus what the
user has told the app about their setup.

Hard rule from the product spec: WattGuard's AI can read the weather, but
it can never know on its own whether a battery is plugged in and charging.
Battery mode ONLY turns on when the user explicitly says they're charging.
"""
from flask import Blueprint, request, jsonify

power_bp = Blueprint("power", __name__)

# Conditions under which solar panels are considered "producing usefully".
SOLAR_FRIENDLY = {"clear", "mostly_clear", "partly_cloudy", "cloudy"}


@power_bp.route("/route", methods=["POST"])
def route_power():
    """
    POST /api/power/route
    Body: {
      "condition": "clear",          # from /api/weather
      "is_day": true,
      "cloud_cover_pct": 20,
      "has_solar": true,
      "battery_charging": false,     # user-entered flag — see module docstring
      "battery_pct": null            # user-entered battery %, only relevant if charging
    }
    """
    body = request.get_json(force=True) or {}

    condition = body.get("condition", "unknown")
    is_day = bool(body.get("is_day"))
    cloud_cover = body.get("cloud_cover_pct") or 0
    has_solar = bool(body.get("has_solar"))
    battery_charging = bool(body.get("battery_charging"))
    battery_pct = body.get("battery_pct")

    # 1. Battery takes priority ONLY when the user has told us it's charging/in use.
    if battery_charging:
        source = "battery"
        solar_output_pct = 0
    # 2. Otherwise, solar if it's daytime, weather allows it, and the user has panels.
    elif has_solar and is_day and condition in SOLAR_FRIENDLY:
        solar_output_pct = max(0, 100 - cloud_cover)
        # very low output isn't worth routing to — fall back to grid
        source = "solar" if solar_output_pct >= 25 else "grid"
        if source == "grid":
            solar_output_pct = 0
    # 3. Default fallback.
    else:
        source = "grid"
        solar_output_pct = 0

    return jsonify({
        "power_source": source,       # "solar" | "grid" | "battery"
        "solar_output_pct": solar_output_pct,
        "reason": _explain(source, condition, is_day, battery_charging),
    })


def _explain(source, condition, is_day, battery_charging):
    if source == "battery":
        return "Running on battery backup (you marked it as charging/in use)."
    if source == "solar":
        return f"Running on solar — {condition.replace('_', ' ')} skies, good production."
    if not is_day:
        return "Running on the utility grid — it's nighttime, no solar production."
    return f"Running on the utility grid — {condition.replace('_', ' ')} conditions limit solar output."


@power_bp.route("/alert-check", methods=["POST"])
def alert_check():
    """
    POST /api/power/alert-check
    Body: { "rain_soon_pct": 80, "battery_pct": 12, "battery_charging": true }

    Powers the "10 minutes before rain / battery runs out" warning.
    Returns should_alert + a plain-language reason so the UI can show a banner.
    """
    body = request.get_json(force=True) or {}
    rain_soon_pct = body.get("rain_soon_pct") or 0
    battery_pct = body.get("battery_pct")
    battery_charging = bool(body.get("battery_charging"))

    if rain_soon_pct >= 70:
        return jsonify({
            "should_alert": True,
            "type": "rain",
            "message": "Rain expected soon — solar output will drop. Switching plans to grid/battery.",
        })

    if battery_charging and battery_pct is not None and battery_pct <= 15:
        return jsonify({
            "should_alert": True,
            "type": "battery_low",
            "message": f"Battery at {battery_pct}% — running low. Here's what you can still safely run.",
        })

    return jsonify({"should_alert": False})
