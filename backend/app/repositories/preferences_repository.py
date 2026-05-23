from sqlalchemy.dialects.postgresql import insert
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
        stmt = (
            insert(UserPreference)
            .values(user_id=user_id, **pref_data)
            .on_conflict_do_update(
                index_elements=["user_id"],
                set_=pref_data,
            )
            .returning(UserPreference)
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.scalar_one()
