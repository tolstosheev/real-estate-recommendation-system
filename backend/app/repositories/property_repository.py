from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete, func, cast
from geoalchemy2 import Geography
from app.models.models import Property
from typing import List


class PropertyRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_bbox(self, min_lat: float,
                          max_lat: float, min_lon: float, max_lon: float):
        bbox = func.ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
        query = select(
            Property,
            func.ST_X(Property.location).label("lon"),
            func.ST_Y(Property.location).label("lat")
        ).filter(func.ST_Intersects(Property.location, bbox))

        result = await self.session.execute(query)
        return result.all()

    async def create(self, property_data: dict) -> Property:
        lat = property_data.pop("lat")
        lon = property_data.pop("lon")

        property_obj = Property(
            **property_data,
            location=func.ST_GeomFromText(f"POINT({lon} {lat})", 4326)
        )
        self.session.add(property_obj)
        await self.session.commit()
        await self.session.refresh(property_obj)
        return property_obj

    async def get_all(self, limit: int = 100, offset: int = 0,
                      min_price: float = None, max_price: float = None,
                      rooms: int = None, property_type: str = None,
                      lat: float = None, lon: float = None, radius_km: float = None):

        query = select(
            Property,
            func.ST_X(Property.location).label("lon"),
            func.ST_Y(Property.location).label("lat")
        )

        if min_price is not None:
            query = query.filter(Property.price >= min_price)
        if max_price is not None:
            query = query.filter(Property.price <= max_price)
        if rooms is not None:
            query = query.filter(Property.rooms == rooms)
        if property_type is not None:
            query = query.filter(Property.property_type == property_type)

        if lat is not None and lon is not None and radius_km is not None:
            point = func.ST_GeomFromText(f"POINT({lon} {lat})", 4326)
            query = query.filter(
                func.ST_DWithin(
                    cast(
                        Property.location, Geography), cast(
                        point, Geography), radius_km * 1000))

        query = query.offset(offset).limit(limit)
        result = await self.session.execute(query)
        return result.all()

    async def get_by_id(self, property_id: str):
        query = select(
            Property, func.ST_X(
                Property.location).label("lon"), func.ST_Y(
                Property.location).label("lat")).filter(
            Property.id == property_id)
        result = await self.session.execute(query)
        return result.first()

    async def get_by_ids(self, property_ids: List[str]) -> List[Property]:
        if not property_ids:
            return []
        query = select(Property).filter(Property.id.in_(property_ids))
        result = await self.session.execute(query)
        return result.scalars().all()

    async def update(self, property_id: str,
                     update_data: dict) -> Property | None:
        if "lat" in update_data and "lon" in update_data:
            lat = update_data.pop("lat")
            lon = update_data.pop("lon")
            update_data["location"] = func.ST_GeomFromText(
                f"POINT({lon} {lat})", 4326)

        query = update(Property).where(Property.id == property_id).values(
            **update_data).execution_options(synchronize_session="fetch")
        await self.session.execute(query)
        await self.session.commit()

        return await self.get_by_id(property_id)

    async def delete(self, property_id: str) -> bool:
        query = delete(Property).where(Property.id == property_id)
        result = await self.session.execute(query)
        await self.session.commit()
        return result.rowcount > 0
