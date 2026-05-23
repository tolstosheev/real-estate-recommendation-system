
from collections.abc import Sequence

from geoalchemy2 import Geography
from sqlalchemy import cast, delete, desc, distinct, func, update
from sqlalchemy.engine import Row
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models import Property

ALLOWED_UPDATE_FIELDS = {
    "title", "description", "price", "rooms", "area", "floor", "total_floors",
    "property_type", "property_purpose", "build_year", "city", "address",
    "district", "metro", "material", "repair_type", "is_new", "lat", "lon",
    "balcony", "parking",
    "images", "sq_living", "sq_kitchen", "room_type", "category",
}


class PropertyRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_bbox(
        self,
        min_lat: float,
        max_lat: float,
        min_lon: float,
        max_lon: float,
        min_price: float | None = None,
        max_price: float | None = None,
        rooms: list[int] | None = None,
        property_type: list[str] | None = None,
        property_purpose: list[str] | None = None,
        district: str | None = None,
        metro: str | None = None,
        material: list[str] | None = None,
        repair_type: list[str] | None = None,
        min_build_year: int | None = None,
        max_build_year: int | None = None,
        city: list[str] | None = None,
        min_area: float | None = None,
        max_area: float | None = None,
        is_new: list[str] | None = None,
        limit: int = 50,
        offset: int = 0,
    ):
        bbox = func.ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
        query = select(
            Property, func.ST_X(Property.location).label("lon"), func.ST_Y(Property.location).label("lat")
        ).filter(func.ST_Intersects(Property.location, bbox))

        if min_price is not None:
            query = query.filter(Property.price >= min_price)
        if max_price is not None:
            query = query.filter(Property.price <= max_price)
        if rooms:
            query = query.filter(Property.rooms.in_(rooms))
        if property_type:
            query = query.filter(func.lower(Property.property_type).in_([t.lower() for t in property_type]))
        if property_purpose:
            query = query.filter(func.lower(Property.property_purpose).in_([p.lower() for p in property_purpose]))
        if district is not None:
            query = query.filter(Property.district == district)
        if metro is not None:
            query = query.filter(Property.metro == metro)
        if material:
            query = query.filter(func.lower(Property.material).in_([m.lower() for m in material]))
        if repair_type:
            query = query.filter(func.lower(Property.repair_type).in_([r.lower() for r in repair_type]))
        if min_build_year is not None:
            query = query.filter(Property.build_year >= min_build_year)
        if max_build_year is not None:
            query = query.filter(Property.build_year <= max_build_year)
        if city:
            query = query.filter(func.lower(Property.city).in_([c.lower() for c in city]))
        if min_area is not None:
            query = query.filter(Property.area >= min_area)
        if max_area is not None:
            query = query.filter(Property.area <= max_area)
        if is_new:
            query = query.filter(func.lower(Property.is_new).in_([n.lower() for n in is_new]))

        query = query.order_by(desc(Property.created_at)).offset(offset).limit(limit)
        result = await self.session.execute(query)
        return result.all()

    async def create(self, property_data: dict) -> Property:
        lat = property_data.pop("lat")
        lon = property_data.pop("lon")

        property_obj = Property(**property_data, location=func.ST_GeomFromText(f"POINT({lon} {lat})", 4326))
        self.session.add(property_obj)
        await self.session.commit()
        await self.session.refresh(property_obj)
        return property_obj

    async def get_all(
        self,
        limit: int = 100,
        offset: int = 0,
        min_price: float | None = None,
        max_price: float | None = None,
        rooms: list[int] | None = None,
        property_type: list[str] | None = None,
        lat: float | None = None,
        lon: float | None = None,
        radius_km: float | None = None,
        district: str | None = None,
        metro: str | None = None,
        material: list[str] | None = None,
        repair_type: list[str] | None = None,
        min_build_year: int | None = None,
        max_build_year: int | None = None,
        city: list[str] | None = None,
        property_purpose: list[str] | None = None,
        search: str | None = None,
        min_area: float | None = None,
        max_area: float | None = None,
        is_new: list[str] | None = None,
    ):

        query = select(Property, func.ST_X(Property.location).label("lon"), func.ST_Y(Property.location).label("lat"))

        if min_price is not None:
            query = query.filter(Property.price >= min_price)
        if max_price is not None:
            query = query.filter(Property.price <= max_price)
        if rooms:
            query = query.filter(Property.rooms.in_(rooms))
        if property_type:
            query = query.filter(func.lower(Property.property_type).in_([t.lower() for t in property_type]))
        if city:
            query = query.filter(func.lower(Property.city).in_([c.lower() for c in city]))
        if property_purpose:
            query = query.filter(func.lower(Property.property_purpose).in_([p.lower() for p in property_purpose]))
        if district is not None:
            query = query.filter(Property.district == district)
        if metro is not None:
            query = query.filter(Property.metro == metro)
        if material:
            query = query.filter(func.lower(Property.material).in_([m.lower() for m in material]))
        if repair_type:
            query = query.filter(func.lower(Property.repair_type).in_([r.lower() for r in repair_type]))
        if min_build_year is not None:
            query = query.filter(Property.build_year >= min_build_year)
        if max_build_year is not None:
            query = query.filter(Property.build_year <= max_build_year)
        if min_area is not None:
            query = query.filter(Property.area >= min_area)
        if max_area is not None:
            query = query.filter(Property.area <= max_area)
        if is_new:
            query = query.filter(func.lower(Property.is_new).in_([n.lower() for n in is_new]))
        if search is not None:
            like_pattern = f"%{search}%"
            query = query.filter(
                Property.title.ilike(like_pattern) | Property.address.ilike(like_pattern)
            )

        if lat is not None and lon is not None and radius_km is not None:
            point = func.ST_GeomFromText(f"POINT({lon} {lat})", 4326)
            query = query.filter(
                func.ST_DWithin(cast(Property.location, Geography), cast(point, Geography), radius_km * 1000)
            )

        query = query.order_by(desc(Property.created_at)).offset(offset).limit(limit)
        result = await self.session.execute(query)
        return result.all()

    async def get_meta(self) -> dict:
        districts = (await self.session.execute(select(distinct(Property.district)).where(Property.district.isnot(None)))).scalars().all()
        metro = (await self.session.execute(select(distinct(Property.metro)).where(Property.metro.isnot(None)))).scalars().all()
        materials = (await self.session.execute(select(distinct(Property.material)).where(Property.material.isnot(None)))).scalars().all()
        repair_types = (await self.session.execute(select(distinct(Property.repair_type)).where(Property.repair_type.isnot(None)))).scalars().all()
        property_types = (await self.session.execute(select(distinct(Property.property_type)).where(Property.property_type.isnot(None)))).scalars().all()
        cities = (await self.session.execute(select(distinct(Property.city)).where(Property.city.isnot(None)).order_by(Property.city))).scalars().all()

        city_centers_raw = (await self.session.execute(
            select(
                Property.city,
                func.avg(func.ST_Y(Property.location)).label("lat"),
                func.avg(func.ST_X(Property.location)).label("lon"),
            ).where(Property.city.isnot(None)).group_by(Property.city)
        )).all()
        city_centers = {row.city: [float(row.lon), float(row.lat)] for row in city_centers_raw}

        return {
            "districts": [d for d in districts if d],
            "metro": [m for m in metro if m],
            "materials": [m for m in materials if m],
            "repair_types": [r for r in repair_types if r],
            "property_types": [p for p in property_types if p],
            "cities": [c for c in cities if c],
            "city_centers": city_centers,
        }

    async def get_by_image_url(self, image_url: str) -> list[Property]:
        result = await self.session.execute(
            select(Property).where(Property.images.any(image_url))
        )
        return list(result.scalars().all())

    async def get_by_user_id(self, user_id: str, limit: int = 100, offset: int = 0):
        query = select(Property, func.ST_X(Property.location).label("lon"), func.ST_Y(Property.location).label("lat")) \
            .filter(Property.user_id == user_id) \
            .order_by(Property.created_at.desc()) \
            .offset(offset).limit(limit)
        result = await self.session.execute(query)
        return result.all()

    async def count_by_user_id(self, user_id: str) -> int:
        result = await self.session.execute(
            select(func.count(Property.id)).where(Property.user_id == user_id)
        )
        return result.scalar() or 0

    async def get_ids_by_user_id(self, user_id: str) -> list[str]:
        result = await self.session.execute(
            select(Property.id).where(Property.user_id == user_id)
        )
        return [str(pid) for pid in result.scalars().all()]

    async def get_by_id(self, property_id: str):
        query = select(
            Property, func.ST_X(Property.location).label("lon"), func.ST_Y(Property.location).label("lat")
        ).filter(Property.id == property_id)
        result = await self.session.execute(query)
        return result.first()

    async def get_by_ids(self, property_ids: list[str]) -> Sequence[Row[tuple[Property, float, float]]]:
        if not property_ids:
            return []
        query = select(
            Property, func.ST_X(Property.location).label("lon"), func.ST_Y(Property.location).label("lat")
        ).filter(Property.id.in_(property_ids))
        result = await self.session.execute(query)
        return result.all()

    async def update(self, property_id: str, update_data: dict) -> Property | None:
        update_data = {k: v for k, v in update_data.items() if k in ALLOWED_UPDATE_FIELDS}
        if "lat" in update_data or "lon" in update_data:
            if "lat" not in update_data or "lon" not in update_data:
                raise ValueError("Both lat and lon must be provided together")
            lat = update_data.pop("lat")
            lon = update_data.pop("lon")
            update_data["location"] = func.ST_GeomFromText(f"POINT({lon} {lat})", 4326)
        else:
            update_data.pop("lat", None)
            update_data.pop("lon", None)

        query = (
            update(Property)
            .where(Property.id == property_id)
            .values(**update_data)
            .execution_options(synchronize_session="fetch")
        )
        await self.session.execute(query)
        await self.session.commit()

        return await self.get_by_id(property_id)

    async def delete(self, property_id: str) -> bool:
        query = delete(Property).where(Property.id == property_id)
        result = await self.session.execute(query)
        await self.session.commit()
        return result.rowcount > 0
