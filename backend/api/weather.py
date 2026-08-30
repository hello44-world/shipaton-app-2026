"""
Live weather lookup — uses Open-Meteo (open-meteo.com), which is free and
needs no API key. This is the "AI weather engine" that everything else
(power routing, alerts) reads from.
"""
from flask import Blueprint, request, jsonify
import requests

weather_bp = Blueprint("weather", __name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# WMO weather codes -> a simple condition label the rest of the app understands.
# https://open-meteo.com/en/docs (weathercode table)
WMO_CONDITIONS = {
    0: "clear",
    1: "mostly_clear",
    2: "partly_cloudy",
    3: "cloudy",
    45: "fog", 48: "fog",
    51: "drizzle", 53: "drizzle", 55: "drizzle",
    61: "rain", 63: "rain", 65: "rain",
    66: "rain", 67: "rain",
    71: "snow", 73: "snow", 75: "snow", 77: "snow",
    80: "rain", 81: "rain", 82: "rain",
    85: "snow", 86: "snow",
    95: "storm", 96: "storm", 99: "storm",
}


def classify_condition(code: int) -> str:
    return WMO_CONDITIONS.get(code, "unknown")


@weather_bp.route("", methods=["GET"])
def get_weather():
    """
    GET /api/weather?lat=31.5&lon=74.3

    Returns current conditions plus a same-hour rain check, which is what
    powers the "10 minutes before rain" alert. Open-Meteo doesn't give
    minute-level rain timing on the free tier, so we treat "rain expected
    in the current hour" as the trigger — good enough for a live demo.
    """
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    if lat is None or lon is None:
        return jsonify({"error": "lat and lon query params are required"}), 400

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,is_day,weather_code,cloud_cover,precipitation",
        "hourly": "precipitation_probability",
        "forecast_days": 1,
        "timezone": "auto",
    }

    try:
        resp = requests.get(OPEN_METEO_URL, params=params, timeout=6)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        return jsonify({"error": f"weather lookup failed: {e}"}), 502

    current = data.get("current", {})
    condition = classify_condition(current.get("weather_code", -1))

    # first hourly probability entry ~= "this hour" rain chance
    hourly_probs = data.get("hourly", {}).get("precipitation_probability", [])
    rain_soon_pct = hourly_probs[0] if hourly_probs else 0

    return jsonify({
        "temperature_f": _c_to_f(current.get("temperature_2m")),
        "is_day": bool(current.get("is_day")),
        "condition": condition,          # clear | partly_cloudy | cloudy | rain | storm | ...
        "cloud_cover_pct": current.get("cloud_cover"),
        "rain_soon_pct": rain_soon_pct,  # chance of rain in the current hour
    })


def _c_to_f(celsius):
    if celsius is None:
        return None
    return round((celsius * 9 / 5) + 32, 1)
