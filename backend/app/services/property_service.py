from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.property_repository import PropertyRepository
from app.repositories.user_repository import UserRepository
from app.services.geocoding_service import GeocodingService
from app.core.redis import RedisClient
import json
import hashlib
from decimal import Decimal


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


class PropertyService:
    def __init__(self, session: AsyncSession):
        self.repository = PropertyRepository(session)
        self.user_repo = UserRepository(session)
        self.geocoder = GeocodingService()
        self.redis = None

    async def _get_redis(self):
        if self.redis is None:
            self.redis = await RedisClient.get_client()
        return self.redis

    def _get_cache_key(self, prefix: str, **kwargs) -> str:
        sorted_params = sorted(kwargs.items())
        param_str = "&".join(f"{k}={v}" for k, v in sorted_params if v is not None)
        param_hash = hashlib.md5(param_str.encode()).hexdigest()
        return f"{prefix}:{param_hash}"

    async def _enrich_property(self, result):
        if result is None:
            return None

        if hasattr(result, "_mapping"):
            mapping = result._mapping
            prop = result[0]
            lon = mapping.get("lon")
            lat = mapping.get("lat")
        elif isinstance(result, (tuple, list)) and len(result) == 3:
            prop, lon, lat = result
        else:
            prop = result
            lat, lon = None, None

        if prop:
            prop.lat = lat
            prop.lon = lon
            prop.owner = await self.user_repo.get_by_id(str(prop.user_id))

        return prop

    async def create_property(self, property_data: dict):
        if "lat" not in property_data or "lon" not in property_data:
            address = property_data.get("address")
            if address:
                coords = await self.geocoder.get_coords_from_address(address)
                if coords:
                    property_data["lat"], property_data["lon"] = coords

        if "lat" not in property_data or "lon" not in property_data:
            raise ValueError("Coordinates are required and could not be determined from the address")

        lat = property_data.get("lat", 0)
        lon = property_data.get("lon", 0)
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            raise ValueError("Invalid coordinates")

        prop = await self.repository.create(property_data)
        result = await self.repository.get_by_id(str(prop.id))
        return await self._enrich_property(result)

    async def get_properties_in_bbox(self, min_lat: float, max_lat: float, min_lon: float, max_lon: float):
        results = await self.repository.get_by_bbox(min_lat, max_lat, min_lon, max_lon)
        return [await self._enrich_property(res) for res in results]

    async def get_property_details(self, property_id: str):
        cache_key = f"prop_details:{property_id}"
        redis = await self._get_redis()

        if redis:
            cached = await redis.get(cache_key)
            if cached:
                return json.loads(cached)

        result = await self.repository.get_by_id(property_id)
        property_obj = await self._enrich_property(result)

        if redis and property_obj:
            owner_data = {
                "id": str(property_obj.owner.id) if property_obj.owner else None,
                "full_name": property_obj.owner.full_name if property_obj.owner else "",
                "phone_number": property_obj.owner.phone_number if property_obj.owner else None,
                "telegram_handle": property_obj.owner.telegram_handle if property_obj.owner else None,
            }
            await redis.setex(
                cache_key,
                600,
                json.dumps(
                    {
                        "id": str(property_obj.id),
                        "user_id": str(property_obj.user_id),
                        "title": property_obj.title,
                        "description": property_obj.description,
                        "price": float(property_obj.price) if property_obj.price else 0.0,
                        "area": float(property_obj.area) if property_obj.area else None,
                        "rooms": property_obj.rooms,
                        "floor": property_obj.floor,
                        "total_floors": property_obj.total_floors,
                        "property_type": property_obj.property_type,
                        "address": property_obj.address,
                        "lat": float(property_obj.lat) if property_obj.lat else 0.0,
                        "lon": float(property_obj.lon) if property_obj.lon else 0.0,
                        "images": list(property_obj.images) if property_obj.images else None,
                        "owner": owner_data,
                        "views_count": property_obj.views_count,
                        "likes_count": property_obj.likes_count,
                    },
                    cls=DecimalEncoder,
                ),
            )

        return property_obj

    async def list_properties(
        self,
        limit: int = 100,
        offset: int = 0,
        min_price: float = None,
        max_price: float = None,
        rooms: int = None,
        property_type: str = None,
        lat: float = None,
        lon: float = None,
        radius_km: float = None,
        district: str = None,
        metro: str = None,
        material: str = None,
        repair_type: str = None,
        min_build_year: int = None,
        max_build_year: int = None,
        property_purpose: str = None,
    ):
        results = await self.repository.get_all(
            limit, offset, min_price, max_price, rooms, property_type, lat, lon, radius_km,
            district, metro, material, repair_type, min_build_year, max_build_year, property_purpose
        )
        return [await self._enrich_property(res) for res in results]

    async def update_property(self, property_id: str, update_data: dict):
        result = await self.repository.update(property_id, update_data)
        return await self._enrich_property(result)

    async def delete_property(self, property_id: str):
        return await self.repository.delete(property_id)
