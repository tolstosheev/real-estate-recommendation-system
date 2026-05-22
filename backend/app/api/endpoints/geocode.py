
import logging

from fastapi import APIRouter, HTTPException, Query

from app.services.geocoding_service import GeocodingService

logger = logging.getLogger(__name__)

router = APIRouter()

SERVICE_CACHE: GeocodingService | None = None


def _get_geocoder() -> GeocodingService:
    global SERVICE_CACHE
    if SERVICE_CACHE is None:
        SERVICE_CACHE = GeocodingService()
    return SERVICE_CACHE


@router.get("/geocode", summary="Geocode address", description="Proxy to Yandex Geocoder (keeps API key server-side)")
async def geocode(address: str = Query(..., min_length=3)):
    import httpx

    geocoder = _get_geocoder()

    if not geocoder.api_key:
        logger.error("YANDEX_API_KEY is not configured")
        return []

    params = {
        "apikey": geocoder.api_key,
        "geocode": address,
        "format": "json",
        "lang": "ru_RU",
        "results": 10,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(geocoder.base_url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        logger.error(f"Yandex geocoder timeout for address: {address}")
        return []
    except httpx.HTTPStatusError as e:
        logger.error(f"Yandex geocoder HTTP error {e.response.status_code} for address: {address}")
        return []
    except Exception as e:
        logger.error(f"Yandex geocoder error for address {address}: {e}")
        return []

    results = []
    members = data.get("response", {}).get("GeoObjectCollection", {}).get("featureMember", [])
    for member in members:
        geo = member.get("GeoObject", {})
        point = geo.get("Point", {}).get("pos", "")
        coords = point.split()
        if len(coords) < 2:
            continue
        lon, lat = float(coords[0]), float(coords[1])
        meta = geo.get("metaDataProperty", {}).get("GeocoderMetaData", {})
        formatted = meta.get("text", "")
        components = meta.get("Address", {}).get("Components", [])
        district = None
        metro = None
        area = None
        for c in components:
            kind = c.get("kind")
            name = c.get("name")
            if kind == "district":
                district = name
            elif kind == "metro":
                metro = name
            elif kind == "area":
                area = name
        if not district:
            district = area

        results.append({
            "lat": lat,
            "lon": lon,
            "address": address,
            "formattedAddress": formatted or address,
            "district": district,
            "metro": metro,
        })

    return results


@router.get("/geocode/reverse", summary="Reverse geocode", description="Proxy reverse geocoding to Yandex")
async def reverse_geocode(lat: float = Query(...), lon: float = Query(...)):
    geocoder = _get_geocoder()
    formatted = await geocoder.get_address_from_coords(lat, lon)
    if not formatted:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"address": formatted}
