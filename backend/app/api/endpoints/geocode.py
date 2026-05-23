
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


@router.get("/geocode/reverse", summary="Reverse geocode", description="Proxy reverse geocoding to Yandex")
async def reverse_geocode(lat: float = Query(...), lon: float = Query(...)):
    geocoder = _get_geocoder()
    formatted = await geocoder.get_address_from_coords(lat, lon)
    if not formatted:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"address": formatted}
