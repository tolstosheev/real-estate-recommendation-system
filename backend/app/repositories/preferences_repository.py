from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models import UserPreference


class UserPreferenceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_user_id(self, user_id: str) -> UserPreference | None:
        result = await self.session.execute(select(UserPreference).filter(UserPreference.user_id == user_id))
        return result.scalar_one_or_none()

    async def update_or_create(self, user_id: str, pref_data: dict) -> UserPreference:
        existing = await self.get_by_user_id(user_id)
        if existing:
            query = (
                update(UserPreference)
                .where(UserPreference.user_id == user_id)
                .values(**pref_data)
                .execution_options(synchronize_session="fetch")
            )
            await self.session.execute(query)
            await self.session.commit()
            await self.session.refresh(existing)
            return existing

        new_pref = UserPreference(user_id=user_id, **pref_data)
        self.session.add(new_pref)
        await self.session.commit()
        await self.session.refresh(new_pref)
        return new_pref
