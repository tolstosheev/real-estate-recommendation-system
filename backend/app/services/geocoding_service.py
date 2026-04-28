import httpx
from app.core.config import settings
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class GeocodingService:
    def __init__(self):
        self.api_key = settings.YANDEX_API_KEY
        self.base_url = "https://geocode-maps.yandex.ru/1.x"

    async def get_coords_from_address(self, address: str) -> Optional[Tuple[float, float]]:
        if not self.api_key:
            logger.error("Yandex API Key is not configured.")
            return None

        params = {
            "apikey": self.api_key,
            "geocode": address,
            "format": "json"
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.base_url, params=params, timeout=5.0)
                response.raise_for_status()
                data = response.json()

                geo_objects = data.get("response", {}).get("GeoObject", {}).get("featureCollection", {}).get("features", [])
                if geo_objects:
                    geometry = geo_objects[0].get("geometry", {}).get("coordinates", [])
                    if len(geometry) >= 2:
                        lon, lat = geometry[0], geometry[1]
                        return lat, lon
        except Exception as e:
            logger.error(f"Geocoding error for address {address}: {e}")
        
        return None
