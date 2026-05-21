from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.interactions_repository import InteractionRepository
from app.repositories.property_repository import PropertyRepository
from app.core.redis import RedisClient
from typing import List
from app.models.models import Property


class InteractionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.interaction_repo = InteractionRepository(session)
        self.property_repo = PropertyRepository(session)

    async def add_interaction(self, user_id: str, interaction_data: dict):
        interaction_type = interaction_data["interaction_type"]
        property_id = interaction_data["property_id"]

        property_exists = await self.property_repo.get_by_id(property_id)
        if not property_exists:
            raise ValueError("Property not found")

        property_obj = property_exists[0]

        existing = await self.interaction_repo.find_interaction(user_id, property_id, interaction_type)

        if existing:
            if interaction_type == "like":
                existing_id = existing[0].id if existing[0] else None
                if existing_id:
                    await self.interaction_repo.remove_interaction(existing_id)
                property_obj.likes_count = max(0, property_obj.likes_count - 1)
                await self.session.commit()
                await RedisClient.clear_user_cache(user_id)
                return {"status": "removed", "interaction": None}
            return {"status": "exists", "interaction": existing}

        interaction = await self.interaction_repo.create_interaction({**interaction_data, "user_id": user_id})

        if interaction_type == "view":
            property_obj.views_count += 1
        elif interaction_type == "like":
            property_obj.likes_count += 1

        await self.session.commit()
        await RedisClient.clear_user_cache(user_id)
        return {"status": "created", "interaction": interaction}

    async def get_favorites(self, user_id: str, limit: int = 100, offset: int = 0) -> List[Property]:
        return await self.interaction_repo.get_user_favorites(user_id, limit, offset)

    async def get_view_history(self, user_id: str, limit: int = 100, offset: int = 0) -> List[Property]:
        return await self.interaction_repo.get_user_view_history(user_id, limit, offset)
