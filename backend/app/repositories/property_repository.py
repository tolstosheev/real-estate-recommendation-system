
from geoalchemy2 import Geography
from sqlalchemy import cast, delete, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models import Property


class PropertyRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_bbox(
        self,
        min_lat: float,
        max_lat: float,
        min_lon: float,
        max_lon: float,
        min_price: float = None,
        max_price: float = None,
        rooms: list[int] | None = None,
        property_type: list[str] | None = None,
        property_purpose: list[str] | None = None,
        district: str = None,
        metro: str = None,
        material: list[str] | None = None,
        repair_type: list[str] | None = None,
        min_build_year: int = None,
        max_build_year: int = None,
        city: list[str] | None = None,
        min_area: float = None,
        max_area: float = None,
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
            query = query.filter(Property.property_type.in_(property_type))
        if property_purpose:
            query = query.filter(Property.property_purpose.in_(property_purpose))
        if district is not None:
            query = query.filter(Property.district == district)
        if metro is not None:
            query = query.filter(Property.metro == metro)
        if material:
            query = query.filter(Property.material.in_(material))
        if repair_type:
            query = query.filter(Property.repair_type.in_(repair_type))
        if min_build_year is not None:
            query = query.filter(Property.build_year >= min_build_year)
        if max_build_year is not None:
            query = query.filter(Property.build_year <= max_build_year)
        if city:
            query = query.filter(Property.city.in_(city))
        if min_area is not None:
            query = query.filter(Property.area >= min_area)
        if max_area is not None:
            query = query.filter(Property.area <= max_area)
        if is_new:
            query = query.filter(Property.is_new.in_(is_new))

        query = query.offset(offset).limit(limit)
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

        query = select(Property, func.ST_X(Property.location).label("lon"), func.ST_Y(Property.location).label("lat"))

        if min_price is not None:
            query = query.filter(Property.price >= min_price)
        if max_price is not None:
            query = query.filter(Property.price <= max_price)
        if rooms:
            query = query.filter(Property.rooms.in_(rooms))
        if property_type:
            query = query.filter(Property.property_type.in_(property_type))
        if city:
            query = query.filter(Property.city.in_(city))
        if property_purpose:
            query = query.filter(Property.property_purpose.in_(property_purpose))
        if district is not None:
            query = query.filter(Property.district == district)
        if metro is not None:
            query = query.filter(Property.metro == metro)
        if material:
            query = query.filter(Property.material.in_(material))
        if repair_type:
            query = query.filter(Property.repair_type.in_(repair_type))
        if min_build_year is not None:
            query = query.filter(Property.build_year >= min_build_year)
        if max_build_year is not None:
            query = query.filter(Property.build_year <= max_build_year)
        if min_area is not None:
            query = query.filter(Property.area >= min_area)
        if max_area is not None:
            query = query.filter(Property.area <= max_area)
        if is_new:
            query = query.filter(Property.is_new.in_(is_new))
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

        query = query.offset(offset).limit(limit)
        result = await self.session.execute(query)
        return result.all()

    async def get_by_id(self, property_id: str):
        query = select(
            Property, func.ST_X(Property.location).label("lon"), func.ST_Y(Property.location).label("lat")
        ).filter(Property.id == property_id)
        result = await self.session.execute(query)
        return result.first()

    async def get_by_ids(self, property_ids: list[str]) -> list[Property]:
        if not property_ids:
            return []
        query = select(
            Property, func.ST_X(Property.location).label("lon"), func.ST_Y(Property.location).label("lat")
        ).filter(Property.id.in_(property_ids))
        result = await self.session.execute(query)
        return result.all()

    async def update(self, property_id: str, update_data: dict) -> Property | None:
        if "lat" in update_data and "lon" in update_data:
            lat = update_data.pop("lat")
            lon = update_data.pop("lon")
            update_data["location"] = func.ST_GeomFromText(f"POINT({lon} {lat})", 4326)

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
