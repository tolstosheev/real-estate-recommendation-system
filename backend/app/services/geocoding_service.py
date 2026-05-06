import httpx
from app.core.config import settings
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class GeocodingService:
    def __init__(self):
        self.api_key = settings.YANDEX_API_KEY
        self.base_url = "https://geocode-maps.yandex.ru/v1"

    async def get_coords_from_address(self, address: str) -> Optional[Tuple[float, float]]:
        if not self.api_key:
            logger.error("Yandex API Key is not configured.")
            return None

        params = {
            "apikey": self.api_key,
            "geocode": address,
            "format": "json",
            "lang": "ru_RU",
            "results": 1
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.base_url, params=params, timeout=5.0)
                response.raise_for_status()
                data = response.json()

                response_data = data.get("response", {})
                collection = response_data.get("GeoObjectCollection", {})
                members = collection.get("featureMember", [])

                if members:
                    geo_object = members[0].get("GeoObject", {})
                    point = geo_object.get("Point", {})
                    pos = point.get("pos", "")
                    if pos:
                        coords = pos.split()
                        if len(coords) >= 2:
                            lon, lat = float(coords[0]), float(coords[1])
                            return lat, lon
        except Exception as e:
            logger.error(f"Geocoding error for address {address}: {e}")

        return None

    async def get_address_from_coords(self, lat: float, lon: float) -> Optional[str]:
        if not self.api_key:
            logger.error("Yandex API Key is not configured.")
            return None

        params = {
            "apikey": self.api_key,
            "geocode": f"{lon},{lat}",
            "format": "json",
            "lang": "ru_RU",
            "results": 1
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.base_url, params=params, timeout=5.0)
                response.raise_for_status()
                data = response.json()

                response_data = data.get("response", {})
                collection = response_data.get("GeoObjectCollection", {})
                members = collection.get("featureMember", [])

                if members:
                    geo_object = members[0].get("GeoObject", {})
                    meta_data = geo_object.get("metaDataProperty", {})
                    geocoder_meta = meta_data.get("GeocoderMetaData", {})
                    text = geocoder_meta.get("text", "")
                    return text
        except Exception as e:
            logger.error(f"Reverse geocoding error for coords ({lat}, {lon}): {e}")

        return None
