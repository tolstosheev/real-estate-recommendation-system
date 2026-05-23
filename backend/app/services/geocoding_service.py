import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class GeocodingService:
    def __init__(self):
        self.api_key = settings.YANDEX_API_KEY
        self.base_url = "https://geocode-maps.yandex.ru/v1"
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=5.0)
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None

    async def get_coords_from_address(self, address: str) -> tuple[float, float] | None:
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
            client = self._get_client()
            response = await client.get(self.base_url, params=params)
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

    async def get_address_from_coords(self, lat: float, lon: float) -> str | None:
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
            client = self._get_client()
            response = await client.get(self.base_url, params=params)
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
