"""Public weather proxy using open-meteo (no API key needed)."""
import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("")
async def get_weather(location: str = Query(..., min_length=1, max_length=80)):
    """Geocode location + fetch current weather. Public for player display."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            geo = await client.get(
                "https://geocoding-api.open-meteo.com/v1/search",
                params={"name": location, "count": 1, "language": "en"},
            )
            geo.raise_for_status()
            g = geo.json()
            if not g.get("results"):
                raise HTTPException(status_code=404, detail="Location not found")
            lat = g["results"][0]["latitude"]
            lon = g["results"][0]["longitude"]
            label = f'{g["results"][0]["name"]}, {g["results"][0].get("country_code", "")}'

            w = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m",
                },
            )
            w.raise_for_status()
            wd = w.json().get("current", {})
            return {
                "location": label,
                "temperature": wd.get("temperature_2m"),
                "weather_code": wd.get("weather_code"),
                "wind": wd.get("wind_speed_10m"),
                "humidity": wd.get("relative_humidity_2m"),
            }
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Weather service unavailable: {e}")
