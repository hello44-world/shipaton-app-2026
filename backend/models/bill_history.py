"""
Simple local bill-history store — a flat JSON file. Good enough for the
demo/single test user; swap for a real per-user database table once auth
is actually persisted (see README's "What's stubbed" section).
"""
import json
import os
from datetime import datetime, timezone

_HISTORY_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "bill_history.json")


def _ensure_file():
    os.makedirs(os.path.dirname(_HISTORY_PATH), exist_ok=True)
    if not os.path.exists(_HISTORY_PATH):
        with open(_HISTORY_PATH, "w") as f:
            json.dump([], f)


def get_history():
    """Returns all logged bills, oldest first."""
    _ensure_file()
    with open(_HISTORY_PATH, "r") as f:
        return json.load(f)


def add_entry(units_kwh, total_amount_usd, usage_by_appliance_hours=None):
    """Appends a new bill entry and returns it."""
    _ensure_file()
    history = get_history()
    entry = {
        "date": datetime.now(timezone.utc).isoformat(),
        "units_kwh": units_kwh,
        "total_amount_usd": total_amount_usd,
        "usage_by_appliance_hours": usage_by_appliance_hours or {},
    }
    history.append(entry)
    with open(_HISTORY_PATH, "w") as f:
        json.dump(history, f, indent=2)
    return entry