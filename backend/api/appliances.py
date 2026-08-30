"""
Turns "what power source are we on right now" into a plain-language,
per-appliance answer: is this safe to run, and for how long — shown in
hours, minutes, or seconds, whichever actually makes sense.
"""
from flask import Blueprint, request, jsonify
from models.appliances import DEFAULT_APPLIANCES

appliances_bp = Blueprint("appliances", __name__)

# Nominal output per solar plate, in watts. Adjust to match real panel specs
# once you know what the target hardware looks like.
WATTS_PER_SOLAR_PLATE = 300


@appliances_bp.route("", methods=["GET"])
def list_appliances():
    return jsonify(DEFAULT_APPLIANCES)


@appliances_bp.route("/safe-to-run", methods=["POST"])
def safe_to_run():
    """
    POST /api/appliances/safe-to-run
    Body: {
      "power_source": "battery",       # "solar" | "grid" | "battery"
      "num_solar_plates": 6,
      "solar_output_pct": 80,
      "battery_capacity_wh": 2000,
      "battery_pct": 40
    }
    """
    body = request.get_json(force=True) or {}
    source = body.get("power_source", "grid")

    results = []
    for appliance in DEFAULT_APPLIANCES:
        if source == "grid":
            results.append(_entry(appliance, True, None, "unlimited"))

        elif source == "solar":
            plates = body.get("num_solar_plates") or 0
            output_pct = body.get("solar_output_pct") or 0
            available_watts = plates * WATTS_PER_SOLAR_PLATE * (output_pct / 100)
            safe = available_watts >= appliance["watts"]
            results.append(_entry(appliance, safe, None, "while_sunny" if safe else None))

        elif source == "battery":
            capacity_wh = body.get("battery_capacity_wh") or 0
            battery_pct = body.get("battery_pct") or 0
            remaining_wh = capacity_wh * (battery_pct / 100)
            runtime_hours = (remaining_wh / appliance["watts"]) if appliance["watts"] else 0
            value, unit = _format_runtime(runtime_hours)
            safe = runtime_hours * 60 >= 1  # at least a minute of runtime
            results.append(_entry(appliance, safe, value, unit))

        else:
            results.append(_entry(appliance, False, None, "unknown_source"))

    return jsonify({"power_source": source, "appliances": results})


def _entry(appliance, safe, runtime_value, runtime_unit):
    return {
        **appliance,
        "safe_to_run": safe,
        "runtime_value": runtime_value,
        "runtime_unit": runtime_unit,  # "hours" | "minutes" | "seconds" | "unlimited" | "while_sunny"
    }


def _format_runtime(hours: float):
    """Pick whichever unit reads naturally — never show '0.02 hours'."""
    if hours >= 1:
        return round(hours, 1), "hours"
    minutes = hours * 60
    if minutes >= 1:
        return round(minutes), "minutes"
    seconds = minutes * 60
    return round(seconds), "seconds"
