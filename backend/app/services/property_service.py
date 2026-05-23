import hashlib
import json
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.category import compute_category
from app.core.redis import RedisClient
from app.models import Interaction, Property
from app.repositories.property_repository import PropertyRepository
from app.repositories.user_repository import UserRepository
from app.services.geocoding_service import GeocodingService


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
        elif isinstance(result, (tuple, list)) and len(result) >= 2:
            prop = result[0]
            lon, lat = result[1], result[2] if len(result) >= 3 else (None, None)
        else:
            prop = result
            lat, lon = None, None

        if prop is not None:
            prop.lat = lat
            prop.lon = lon
            try:
                user_id = str(prop.user_id) if prop.user_id else None
                prop.owner = await self.user_repo.get_by_id(user_id) if user_id else None
            except Exception:
                prop.owner = None

        return prop

    async def batch_enrich(self, results):
        if not results:
            return []

        enriched = []
        user_ids = set()
        for result in results:
            if hasattr(result, "_mapping") or isinstance(result, (tuple, list)):
                prop = result[0]
            else:
                prop = result
            if prop is not None and prop.user_id:
                user_ids.add(str(prop.user_id))

        users = await self.user_repo.get_by_ids(list(user_ids)) if user_ids else {}

        for result in results:
            if hasattr(result, "_mapping"):
                mapping = result._mapping
                prop = result[0]
                lon = mapping.get("lon")
                lat = mapping.get("lat")
            elif isinstance(result, (tuple, list)) and len(result) >= 2:
                prop = result[0]
                lon, lat = result[1], result[2] if len(result) >= 3 else (None, None)
            else:
                prop = result
                lat, lon = None, None

            if prop is not None:
                prop.lat = lat
                prop.lon = lon
                uid = str(prop.user_id) if prop.user_id else None
                prop.owner = users.get(uid) if uid else None

            enriched.append(prop)

        return enriched

    async def create_property(self, property_data: dict):
        property_type = property_data.get("property_type")
        rooms = property_data.get("rooms")
        if property_type and rooms is not None:
            property_data["category"] = compute_category(property_type, rooms)

        lat = property_data.get("lat", 0.0)
        lon = property_data.get("lon", 0.0)

        if lat == 0.0 and lon == 0.0:
            address = property_data.get("address")
            if address:
                coords = await self.geocoder.get_coords_from_address(address)
                if coords:
                    property_data["lat"], property_data["lon"] = coords
                    lat, lon = coords

        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            raise ValueError("Invalid coordinates")

        prop = await self.repository.create(property_data)
        result = await self.repository.get_by_id(str(prop.id))
        return await self._enrich_property(result)

    async def get_properties_in_bbox(
        self, min_lat: float, max_lat: float, min_lon: float, max_lon: float,
        min_price: float = None, max_price: float = None,
        rooms: list[int] | None = None,
        property_type: list[str] | None = None,
        property_purpose: list[str] | None = None,
        district: str = None, metro: str = None,
        material: list[str] | None = None,
        repair_type: list[str] | None = None,
        min_build_year: int = None, max_build_year: int = None,
        city: list[str] | None = None,
        min_area: float = None, max_area: float = None,
        is_new: list[str] | None = None,
        limit: int = 50, offset: int = 0,
    ):
        results = await self.repository.get_by_bbox(
            min_lat, max_lat, min_lon, max_lon,
            min_price=min_price, max_price=max_price,
            rooms=rooms, property_type=property_type,
            property_purpose=property_purpose,
            district=district, metro=metro,
            material=material, repair_type=repair_type,
            min_build_year=min_build_year, max_build_year=max_build_year,
            city=city, min_area=min_area, max_area=max_area,
            is_new=is_new, limit=limit, offset=offset,
        )
        return await self.batch_enrich(results)

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
                        "city": property_obj.city,
                        "area": float(property_obj.area) if property_obj.area else None,
                        "sq_living": float(property_obj.sq_living) if property_obj.sq_living else None,
                        "sq_kitchen": float(property_obj.sq_kitchen) if property_obj.sq_kitchen else None,
                        "rooms": property_obj.rooms,
                        "floor": property_obj.floor,
                        "total_floors": property_obj.total_floors,
                        "property_type": property_obj.property_type,
                        "property_purpose": property_obj.property_purpose,
                        "category": property_obj.category,
                        "address": property_obj.address,
                        "lat": float(property_obj.lat) if property_obj.lat else 0.0,
                        "lon": float(property_obj.lon) if property_obj.lon else 0.0,
                        "images": list(property_obj.images) if property_obj.images else None,
                        "owner": owner_data,
                        "views_count": property_obj.views_count,
                        "likes_count": property_obj.likes_count,
                        "district": property_obj.district,
                        "metro": property_obj.metro,
                        "build_year": property_obj.build_year,
                        "material": property_obj.material,
                        "repair_type": property_obj.repair_type,
                        "room_type": property_obj.room_type,
                        "is_new": property_obj.is_new,
                        "balcony": property_obj.balcony,
                        "parking": property_obj.parking,
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
        rooms: list[int] | None = None,
        property_type: list[str] | None = None,
        lat: float = None,
        lon: float = None,
        radius_km: float = None,
        district: str = None,
        metro: str = None,
        material: list[str] | None = None,
        repair_type: list[str] | None = None,
        min_build_year: int = None,
        max_build_year: int = None,
        city: list[str] | None = None,
        property_purpose: list[str] | None = None,
        search: str = None,
        min_area: float = None,
        max_area: float = None,
        is_new: list[str] | None = None,
    ):
        results = await self.repository.get_all(
            limit, offset, min_price, max_price, rooms, property_type, lat, lon, radius_km,
            district, metro, material, repair_type, min_build_year, max_build_year, city, property_purpose,
            search, min_area, max_area, is_new,
        )
        return await self.batch_enrich(results)

    async def update_property(self, property_id: str, update_data: dict):
        if "property_type" in update_data or "rooms" in update_data:
            existing = await self.repository.get_by_id(property_id)
            if existing:
                prop = existing[0]
                property_type = update_data.get("property_type") or prop.property_type
                rooms = update_data.get("rooms") or prop.rooms
                if property_type and rooms is not None:
                    update_data["category"] = compute_category(property_type, rooms)

        result = await self.repository.update(property_id, update_data)
        redis = await self._get_redis()
        if redis:
            await redis.delete(f"prop_details:{property_id}")
        return await self._enrich_property(result)

    async def get_user_properties(self, user_id: str, limit: int = 100, offset: int = 0):
        query = select(Property, func.ST_X(Property.location).label("lon"), func.ST_Y(Property.location).label("lat")) \
            .filter(Property.user_id == user_id) \
            .order_by(Property.created_at.desc()) \
            .offset(offset).limit(limit)
        result = await self.repository.session.execute(query)
        return await self.batch_enrich(result.all())

    async def delete_property(self, property_id: str):
        await self.repository.session.execute(
            delete(Interaction).where(Interaction.property_id == property_id)
        )
        return await self.repository.delete(property_id)
