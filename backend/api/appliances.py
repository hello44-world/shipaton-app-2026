"""
Turns "what power source are we on right now" into a plain-language,
per-appliance answer: is this safe to run, and for how long.
"""
from flask import Blueprint, request, jsonify
from models.appliances import DEFAULT_APPLIANCES
from models.database import set_user_appliances, get_user_appliances

appliances_bp = Blueprint("appliances", __name__)

WATTS_PER_SOLAR_PLATE = 300

# Below this %, the battery is considered unusable/protected — must match
# BATTERY_CUTOFF_PCT in power.py so the two stay consistent.
BATTERY_CUTOFF_PCT = 15


@appliances_bp.route("/catalog", methods=["GET"])
def list_catalog():
    return jsonify(DEFAULT_APPLIANCES)


@appliances_bp.route("", methods=["GET"])
def list_appliances():
    return jsonify(DEFAULT_APPLIANCES)


@appliances_bp.route("/user/<int:user_id>", methods=["GET"])
def get_user_appliance_list(user_id):
    return jsonify(get_user_appliances(user_id))


@appliances_bp.route("/user/<int:user_id>", methods=["POST"])
def save_user_appliance_list(user_id):
    body = request.get_json(force=True) or {}
    appliances = body.get("appliances") or []

    for a in appliances:
        if not a.get("name") or a.get("category") not in ("permanent", "temporary") or not a.get("watts"):
            return jsonify({"error": "Each appliance needs a name, category (permanent/temporary), and watts."}), 400

    set_user_appliances(user_id, appliances)
    return jsonify({"saved": len(appliances)})


def _appliances_for(user_id):
    if user_id is not None:
        user_appliances = get_user_appliances(user_id)
        if user_appliances:
            return user_appliances
    return DEFAULT_APPLIANCES


@appliances_bp.route("/safe-to-run", methods=["POST"])
def safe_to_run():
    body = request.get_json(force=True) or {}
    source = body.get("power_source", "grid")
    user_id = body.get("user_id")
    appliances = _appliances_for(user_id)

    if source == "solar":
        return jsonify(_solar_response(body, appliances))

    results = []
    for appliance in appliances:
        if source == "grid":
            results.append(_entry(appliance, True, None, "unlimited"))

        elif source == "battery":
            capacity_wh = body.get("battery_capacity_wh") or 0
            battery_pct = body.get("battery_pct") or 0
            # Only the charge above the cutoff counts as usable — protects
            # the battery from being drained past its safe minimum.
            usable_pct = max(0, battery_pct - BATTERY_CUTOFF_PCT)
            remaining_wh = capacity_wh * (usable_pct / 100)
            runtime_hours = (remaining_wh / appliance["watts"]) if appliance["watts"] else 0
            value, unit = _format_runtime(runtime_hours)
            safe = runtime_hours * 60 >= 1
            results.append(_entry(appliance, safe, value, unit))

        else:
            results.append(_entry(appliance, False, None, "unknown_source"))

    return jsonify({"power_source": source, "appliances": results})


def _solar_response(body, appliances):
    plates = body.get("num_solar_plates") or 0
    output_pct = body.get("solar_output_pct") or 0
    hours_until_sunset = body.get("hours_until_sunset")
    available_watts = plates * WATTS_PER_SOLAR_PLATE * (output_pct / 100)

    running, switch_off = _compute_runnable_set(appliances, available_watts)
    running_ids = {a["id"] for a in running}
    runtime_value, runtime_unit = _solar_runtime(hours_until_sunset)

    can_run_now = [
        {**a, "runtime_value": runtime_value, "runtime_unit": runtime_unit}
        for a in running
    ]

    can_run_with_switch = []
    for appliance in appliances:
        if appliance["id"] in running_ids:
            continue
        can_run_with_switch.append({
            **appliance,
            "runtime_value": runtime_value,
            "runtime_unit": runtime_unit,
            "switch_off_name": switch_off.get(appliance["id"]),
        })

    return {
        "power_source": "solar",
        "available_watts": round(available_watts),
        "can_run_now": can_run_now,
        "can_run_with_switch": can_run_with_switch,
    }


def _solar_runtime(hours_until_sunset):
    if hours_until_sunset is None or hours_until_sunset <= 0:
        return None, "while_sunny"
    if hours_until_sunset >= 1:
        return round(hours_until_sunset, 1), "hours_until_sunset"
    return round(hours_until_sunset * 60), "minutes_until_sunset"


def _compute_runnable_set(appliances, available_watts):
    permanent = [a for a in appliances if a["category"] == "permanent"]
    temporary = [a for a in appliances if a["category"] == "temporary"]
    ordered = permanent + temporary

    running = []
    used_watts = 0
    switch_off = {}

    for appliance in ordered:
        if used_watts + appliance["watts"] <= available_watts:
            running.append(appliance)
            used_watts += appliance["watts"]
        else:
            candidate = _find_switch_off_candidate(running, appliance["watts"])
            switch_off[appliance["id"]] = candidate["name"] if candidate else None

    return running, switch_off


def _find_switch_off_candidate(running, watts_needed):
    candidates = [a for a in running if a["watts"] >= watts_needed]
    if not candidates:
        return None
    return max(candidates, key=lambda a: a["watts"])


def _entry(appliance, safe, runtime_value, runtime_unit):
    return {
        **appliance,
        "safe_to_run": safe,
        "runtime_value": runtime_value,
        "runtime_unit": runtime_unit,
    }


def _format_runtime(hours: float):
    if hours >= 1:
        return round(hours, 1), "hours"
    minutes = hours * 60
    if minutes >= 1:
        return round(minutes), "minutes"
    seconds = minutes * 60
    return round(seconds), "seconds"