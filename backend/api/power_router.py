"""
Power source routing — decides whether the home is (or should be) running
on Solar, the Utility Grid, or Battery.

The decision process, in order:
1. Check real solar strength for the user's location, from /api/weather's
   `solar_strength` field (based on actual irradiance/GHI — not just a
   weather label). This works day or night, rain or shine — no separate
   "is it night" check needed, since low/no sunlight covers night too.
2. Solar strong/moderate — the home runs on solar automatically. No
   question needed. Any surplus over the load charges the battery.
3. Solar weak/none — there's no way to auto-detect what the user's actually
   drawing from (utility or battery), so the app asks them directly. Once
   they answer:
   - Utility  -> route normally against grid (no capacity limits).
   - Battery  -> requires a live battery %, entered right then (never
     asked ahead of time, since charge changes by the hour). Below the
     safe cutoff, battery is considered unusable and we fall back to grid.

Hard rule from the product spec: WattGuard's AI can read the weather, but
it can never sense battery charge on its own — it always comes from what
the user enters.
"""
from flask import Blueprint, request, jsonify

power_bp = Blueprint("power", __name__)

# Below this %, the battery is considered unusable/protected — same cutoff
# used in the safe-to-run capacity math, so the two stay consistent.
BATTERY_CUTOFF_PCT = 15


@power_bp.route("/route", methods=["POST"])
def route_power():
    """
    POST /api/power/route
    Body: {
      "solar_strength": "strong",   # from /api/weather: strong | moderate | weak | none
      "has_solar": true,
      "has_battery": true,
      "user_choice": "battery",     # optional — "utility" or "battery",
                                      # only sent once the user's answered
                                      # the on-screen question. Omit on the
                                      # first call for a given weather read.
      "battery_pct": 62              # required only when user_choice == "battery"
    }

    Response includes "needs_user_choice": true when solar isn't producing
    and we don't have an answer yet — the app should show the Utility vs
    Battery picker and re-call this endpoint with "user_choice" set.
    """
    body = request.get_json(force=True) or {}

    solar_strength = body.get("solar_strength", "none")
    has_solar = bool(body.get("has_solar"))
    has_battery = bool(body.get("has_battery"))
    user_choice = body.get("user_choice")
    battery_pct = body.get("battery_pct")

    solar_output_pct = 0

    # Solar strong enough to run on -> no question needed.
    if has_solar and solar_strength in ("strong", "moderate"):
        solar_output_pct = 100 if solar_strength == "strong" else 60
        return jsonify({
            "power_source": "solar",
            "needs_user_choice": False,
            "solar_output_pct": solar_output_pct,
            "reason": f"Running on solar — {solar_strength} sunlight right now.",
        })

    # Solar weak/none (or no panels at all) -> need to know what's actually
    # being used, since the app can't sense that on its own.
    if user_choice is None:
        return jsonify({
            "power_source": None,
            "needs_user_choice": True,
            "solar_output_pct": 0,
            "reason": "Solar isn't producing enough right now — need to know what you're running on.",
        })

    if user_choice == "utility":
        return jsonify({
            "power_source": "grid",
            "needs_user_choice": False,
            "solar_output_pct": 0,
            "reason": "Running on the utility grid — solar isn't producing right now.",
        })

    if user_choice == "battery":
        if has_battery and battery_pct is not None and battery_pct > BATTERY_CUTOFF_PCT:
            return jsonify({
                "power_source": "battery",
                "needs_user_choice": False,
                "solar_output_pct": 0,
                "reason": f"Running on battery — {battery_pct}% charge. Conserve where you can, since there's no way to know when solar or grid will be back.",
            })
        # Battery too low (or no battery) to rely on -> fall back to grid.
        return jsonify({
            "power_source": "grid",
            "needs_user_choice": False,
            "solar_output_pct": 0,
            "reason": f"Battery too low to run on ({battery_pct}%, minimum is {BATTERY_CUTOFF_PCT}%) — switched to the utility grid.",
        })

    # Unrecognized choice value — safest fallback.
    return jsonify({
        "power_source": "grid",
        "needs_user_choice": False,
        "solar_output_pct": 0,
        "reason": "Couldn't determine your power source — defaulted to the utility grid.",
    })


@power_bp.route("/alert-check", methods=["POST"])
def alert_check():
    """
    POST /api/power/alert-check
    Body: { "rain_soon_pct": 80, "battery_pct": 12, "has_battery": true }

    Powers the "rain incoming / battery running out" warning banner.
    """
    body = request.get_json(force=True) or {}
    rain_soon_pct = body.get("rain_soon_pct") or 0
    battery_pct = body.get("battery_pct")
    has_battery = bool(body.get("has_battery"))

    if rain_soon_pct >= 70:
        return jsonify({
            "should_alert": True,
            "type": "rain",
            "message": "Rain expected soon — solar output will drop. Switching plans to grid/battery.",
        })

    if has_battery and battery_pct is not None and battery_pct <= 25 and battery_pct > BATTERY_CUTOFF_PCT:
        return jsonify({
            "should_alert": True,
            "type": "battery_low",
            "message": f"Battery at {battery_pct}% — getting low. Start conserving now.",
        })

    if has_battery and battery_pct is not None and battery_pct <= BATTERY_CUTOFF_PCT:
        return jsonify({
            "should_alert": True,
            "type": "battery_critical",
            "message": f"Battery at {battery_pct}% — nearly dead. Switch to the utility grid now if it's available.",
        })

    return jsonify({"should_alert": False})