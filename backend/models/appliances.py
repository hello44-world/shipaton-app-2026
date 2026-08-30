"""
Default appliance catalog. In a later pass this would move to a real
database (SQLite/Postgres) keyed by user — for now it's a static list the
whole app can import, which is enough for the hackathon demo.

watts: typical running power draw
category: "permanent" (used daily/essential) or "temporary" (occasional)
"""

DEFAULT_APPLIANCES = [
    {"id": "ac",        "name": "Air conditioner", "watts": 1500, "category": "permanent"},
    {"id": "fridge",    "name": "Refrigerator",     "watts": 150,  "category": "permanent"},
    {"id": "water_pump","name": "Water pump",       "watts": 750,  "category": "permanent"},
    {"id": "iron",      "name": "Iron",             "watts": 1100, "category": "temporary"},
    {"id": "washer",    "name": "Washing machine",  "watts": 500,  "category": "temporary"},
    {"id": "microwave", "name": "Microwave",        "watts": 1000, "category": "temporary"},
    {"id": "tv",        "name": "TV",               "watts": 120,  "category": "permanent"},
    {"id": "lights",    "name": "Lights",           "watts": 60,   "category": "permanent"},
]


def get_appliance(appliance_id: str):
    return next((a for a in DEFAULT_APPLIANCES if a["id"] == appliance_id), None)
