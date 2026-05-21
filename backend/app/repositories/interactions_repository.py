from typing import List, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from app.models import Interaction, Property


class InteractionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_interaction(self, interaction_data: dict) -> Interaction:
        weights = {"view": 1, "like": 5}
        interaction_data["weight"] = weights.get(interaction_data["interaction_type"], 1)

        interaction_obj = Interaction(**interaction_data)
        self.session.add(interaction_obj)
        await self.session.commit()
        await self.session.refresh(interaction_obj)
        return interaction_obj

    async def get_user_favorites(self, user_id: str, limit: int = 100, offset: int = 0):
        query = (
            select(Property)
            .join(Interaction, Property.id == Interaction.property_id)
            .filter(Interaction.user_id == user_id, Interaction.interaction_type == "like")
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def get_user_view_history(self, user_id: str, limit: int = 100, offset: int = 0):
        query = (
            select(Property, Interaction.created_at)
            .join(Interaction, Property.id == Interaction.property_id)
            .filter(Interaction.user_id == user_id, Interaction.interaction_type == "view")
            .order_by(Interaction.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(query)

        seen = set()
        unique_properties = []
        for row in result.all():
            prop = row[0]
            if prop.id not in seen:
                seen.add(prop.id)
                unique_properties.append(prop)
        return unique_properties

    async def find_interaction(self, user_id: str, property_id: str, interaction_type: str = None):
        query = select(Interaction).filter(Interaction.user_id == user_id, Interaction.property_id == property_id)
        if interaction_type:
            query = query.filter(Interaction.interaction_type == interaction_type)
        query = query.order_by(Interaction.created_at.desc())
        result = await self.session.execute(query)
        return result.first()

    async def batch_check_likes(self, user_id, property_ids: List) -> Set[str]:
        if not property_ids:
            return set()
        query = select(Interaction.property_id).filter(
            Interaction.user_id == user_id,
            Interaction.property_id.in_(property_ids),
            Interaction.interaction_type == "like",
        )
        result = await self.session.execute(query)
        return {str(row[0]) for row in result.all()}

    async def remove_interaction(self, interaction_id: int):
        query = delete(Interaction).where(Interaction.id == interaction_id)
        result = await self.session.execute(query)
        await self.session.commit()
        return result.rowcount > 0
