from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.property_repository import PropertyRepository

class PropertyService:
    def __init__(self, session: AsyncSession):
        self.repository = PropertyRepository(session)

    async def create_property(self, property_data: dict):
        return await self.repository.create(property_data)

    async def list_properties(self, limit: int = 100, offset: int = 0):
        return await self.repository.get_all(limit, offset)

    async def get_property_details(self, property_id: str):
        return await self.repository.get_by_id(property_id)
