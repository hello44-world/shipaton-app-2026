"""
One-time seed script for the demo — creates a few months of realistic past
bill history so the "honest analysis" comparison feature has something to
compare against. Run once before recording: python3 seed_history.py

NOTE: this is disclosed sample data for demo purposes only, since real
usage only started today. Explain this on camera when showing the feature.
"""
import json
import os
from datetime import datetime, timedelta, timezone

_HISTORY_PATH = os.path.join(os.path.dirname(__file__), "data", "bill_history.json")

# Each entry: (days_ago, units_kwh, total_amount_usd, usage_by_appliance_hours)
# Story arc: a normal month, then a spike month (heavy AC use on grid because
# it was cloudy a lot), which is exactly the kind of thing the honest-analysis
# feature is meant to catch and explain.
SEED_ENTRIES = [
    (90, 320, 41.60, {"fridge": 720, "fan": 300, "lights": 150}),
    (60, 305, 39.65, {"fridge": 720, "fan": 280, "lights": 140}),
    (30, 460, 59.80, {"fridge": 720, "ac": 180, "fan": 260, "lights": 150, "washing_machine": 20}),
]


def seed():
    os.makedirs(os.path.dirname(_HISTORY_PATH), exist_ok=True)

    history = []
    if os.path.exists(_HISTORY_PATH):
        with open(_HISTORY_PATH, "r") as f:
            history = json.load(f)

    now = datetime.now(timezone.utc)
    for days_ago, units, amount, usage in SEED_ENTRIES:
        entry = {
            "date": (now - timedelta(days=days_ago)).isoformat(),
            "units_kwh": units,
            "total_amount_usd": amount,
            "usage_by_appliance_hours": usage,
        }
        history.append(entry)

    with open(_HISTORY_PATH, "w") as f:
        json.dump(history, f, indent=2)

    print(f"Seeded {len(SEED_ENTRIES)} entries into {_HISTORY_PATH}")
    print("Remember to disclose this is sample data when recording the demo.")


if __name__ == "__main__":
    seed()