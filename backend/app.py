"""
WattGuard backend — Flask API
Run with: python3 app.py  (starts on http://localhost:5000)
"""
from flask import Flask, jsonify
from flask_cors import CORS

from api.weather import weather_bp
from api.power_router import power_bp
from api.bill import bill_bp
from api.appliances import appliances_bp

app = Flask(__name__)
CORS(app)  # allows the Expo app (running on a different port/device) to call this API

app.register_blueprint(weather_bp, url_prefix="/api/weather")
app.register_blueprint(power_bp, url_prefix="/api/power")
app.register_blueprint(bill_bp, url_prefix="/api/bill")
app.register_blueprint(appliances_bp, url_prefix="/api/appliances")


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "service": "wattguard-backend"})


if __name__ == "__main__":
    # host="0.0.0.0" so your phone (on Expo Go) can reach it over the same wifi network
    app.run(host="0.0.0.0", port=5000, debug=True)
