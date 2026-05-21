from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import RedisClient
from app.repositories.preferences_repository import UserPreferenceRepository


class UserPreferenceService:
    def __init__(self, session: AsyncSession):
        self.repository = UserPreferenceRepository(session)

    async def get_preferences(self, user_id: str):
        return await self.repository.get_by_user_id(user_id)

    async def set_preferences(self, user_id: str, pref_data: dict):
        res = await self.repository.update_or_create(user_id, pref_data)
        await RedisClient.clear_user_cache(user_id)
        return res
