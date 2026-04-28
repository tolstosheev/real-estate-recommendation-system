from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.property_repository import PropertyRepository
from app.repositories.user_repository import UserRepository
from app.services.geocoding_service import GeocodingService
from typing import List, Optional

class PropertyService:
    def __init__(self, session: AsyncSession):
        self.repository = PropertyRepository(session)
        self.user_repo = UserRepository(session)
        self.geocoder = GeocodingService()

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
            raise HTTPException(status_code=400, detail="Coordinates are required and could not be determined from the address")

        prop = await self.repository.create(property_data)
        result = await self.repository.get_by_id(str(prop.id))
        return await self._enrich_property(result)

    async def get_properties_in_bbox(self, min_lat: float, max_lat: float, min_lon: float, max_lon: float):
        results = await self.repository.get_by_bbox(min_lat, max_lat, min_lon, max_lon)
        return [await self._enrich_property(res) for res in results]

    async def list_properties(self, limit: int = 100, offset: int = 0, 
                                 min_price: float = None, max_price: float = None, 
                                 rooms: int = None, property_type: str = None,
                                 lat: float = None, lon: float = None, radius_km: float = None):
        results = await self.repository.get_all(limit, offset, min_price, max_price, rooms, property_type, lat, lon, radius_km)
        return [await self._enrich_property(res) for res in results]


    async def get_property_details(self, property_id: str):
        result = await self.repository.get_by_id(property_id)
        return await self._enrich_property(result)

    async def update_property(self, property_id: str, update_data: dict):
        result = await self.repository.update(property_id, update_data)
        return await self._enrich_property(result)

    async def delete_property(self, property_id: str):
        return await self.repository.delete(property_id)

