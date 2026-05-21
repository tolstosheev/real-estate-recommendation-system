from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models import User
from typing import List


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
        result = await self.session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: str) -> User | None:
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_ids(self, user_ids: List[str]) -> dict[str, User]:
        if not user_ids:
            return {}
        result = await self.session.execute(
            select(User).where(User.id.in_(user_ids))
        )
        users = result.scalars().all()
        return {str(u.id): u for u in users}

    async def update(self, user_id: str, user_data: dict) -> User | None:
        user = await self.get_by_id(user_id)
        if not user:
            return None
        for key, value in user_data.items():
            if hasattr(user, key):
                setattr(user, key, value)
        await self.session.commit()
        await self.session.refresh(user)
        return user
