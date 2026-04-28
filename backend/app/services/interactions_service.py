from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.interactions_repository import InteractionRepository
from app.repositories.property_repository import PropertyRepository
from typing import List, Union
from app.models.models import Property

class InteractionService:
    def __init__(self, session: AsyncSession):
        self.interaction_repo = InteractionRepository(session)
        self.property_repo = PropertyRepository(session)

    async def add_interaction(self, user_id: str, interaction_data: dict):
        interaction_data["user_id"] = user_id
        
        property_id = interaction_data["property_id"]
        property_exists = await self.property_repo.get_by_id(property_id)
        if not property_exists:
            raise ValueError("Property not found")

        existing = await self.interaction_repo.find_interaction(user_id, property_id)
        if existing:
            if existing.interaction_type == interaction_data["interaction_type"]:
                if interaction_data["interaction_type"] == "like":
                    await self.interaction_repo.remove_interaction(existing.id)
                    return {"status": "removed", "interaction": None}
                return {"status": "exists", "interaction": existing}
            
            await self.interaction_repo.remove_interaction(existing.id)
        
        interaction = await self.interaction_repo.create_interaction(interaction_data)
        return {"status": "created", "interaction": interaction}

    async def get_favorites(self, user_id: str) -> List[Property]:
        return await self.interaction_repo.get_user_favorites(user_id)

