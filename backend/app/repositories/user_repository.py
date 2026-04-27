from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from .models.models import User

class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user_data: dict) -> User:
        user_obj = User(**user_data)
        self.session.add(user_obj)
        await self.session.commit()
        await self.session.refresh(user_obj)
        return user_obj

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(User).filter(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: str) -> User | None:
        result = await self.session.execute(select(User).filter(User.id == user_id))
        return result.scalar_one_or_none()
