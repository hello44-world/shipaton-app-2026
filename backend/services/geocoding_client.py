"""
Turns a city + local area/society name into real coordinates, using
Open-Meteo's free geocoding endpoint (same provider as weather.py).
"""
import requests

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"


def geocode(city: str, area: str = None):
    queries = []
    if area:
        queries.append(f"{area}, {city}")
    queries.append(city)

    for q in queries:
        try:
            resp = requests.get(GEOCODE_URL, params={"name": q, "count": 1}, timeout=8)
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException:
            continue

        results = data.get("results")
        if results:
            top = results[0]
            return {
                "latitude": top["latitude"],
                "longitude": top["longitude"],
                "resolved_name": ", ".join(
                    part for part in [top.get("name"), top.get("admin1"), top.get("country")] if part
                ),
            }

    return None