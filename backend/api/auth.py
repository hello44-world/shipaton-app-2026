"""
Real signup/login — replaces the mobile app's UI-only auth stub.

Signup geocodes the user's city + area once, at account creation, and
stores the resulting lat/lon on their user row. Every later weather call
for that user reads the stored coordinates instead of asking again.

NOTE: passwords are stored in plain text. That's fine for a hackathon demo
with no real users, but call it out if this project goes further.
"""
from flask import Blueprint, request, jsonify
from models.database import create_user, get_user_by_username, update_user_setup
from services.geocoding_client import geocode

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/signup", methods=["POST"])
def signup():
    """
    POST /api/auth/signup
    Body: { "username": ..., "password": ..., "country": ..., "city": ..., "area": ... }
    """
    body = request.get_json(force=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    country = (body.get("country") or "").strip()
    city = (body.get("city") or "").strip()
    area = (body.get("area") or "").strip()

    if not username or not password or not country or not city:
        return jsonify({"error": "username, password, country, and city are required"}), 400

    if get_user_by_username(username):
        return jsonify({"error": "That username is already taken."}), 409

    location = geocode(city, area)
    if not location:
        return jsonify({"error": f"Couldn't find a location for '{area}, {city}'. Check the spelling."}), 422

    user_id = create_user(
        username, password, country, city, area,
        location["latitude"], location["longitude"],
    )

    return jsonify({
        "user_id": user_id,
        "username": username,
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "resolved_location": location["resolved_name"],
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    POST /api/auth/login
    Body: { "username": ..., "password": ... }
    Returns the user's stored setup so the app can skip straight to the
    dashboard if they've already been through setup before.
    """
    body = request.get_json(force=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""

    user = get_user_by_username(username)
    if not user or user["password"] != password:
        return jsonify({"error": "Incorrect username or password."}), 401

    return jsonify({
        "user_id": user["id"],
        "username": user["username"],
        "country": user["country"],
        "latitude": user["latitude"],
        "longitude": user["longitude"],
        "num_solar_plates": user["num_solar_plates"],
        "has_battery": bool(user["has_battery"]),
        "battery_capacity_wh": user["battery_capacity_wh"],
    })


@auth_bp.route("/user/<int:user_id>/setup", methods=["POST"])
def save_setup(user_id):
    """
    POST /api/auth/user/<user_id>/setup
    Body: { "num_solar_plates": 6, "has_battery": true, "battery_capacity_wh": 2000 }
    Called from the Setup screen once the user answers the solar/battery
    questions, so it's remembered for next time they log in.
    """
    body = request.get_json(force=True) or {}
    update_user_setup(
        user_id,
        body.get("num_solar_plates") or 0,
        bool(body.get("has_battery")),
        body.get("battery_capacity_wh") or 0,
    )
    return jsonify({"saved": True})