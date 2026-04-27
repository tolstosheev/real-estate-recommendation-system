from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.models import Property

class PropertyRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, property_data: dict) -> Property:
        property_obj = Property(**property_data)
        self.session.add(property_obj)
        await self.session.commit()
        await self.session.refresh(property_obj)
        return property_obj

    async def get_all(self, limit: int = 100, offset: int = 0):
        result = await self.session.execute(select(Property).offset(offset).limit(limit))
        return result.scalars().all()

    async def get_by_id(self, property_id: str):
        result = await self.session.execute(select(Property).filter(Property.id == property_id))
        return result.scalar_one_or_none()
