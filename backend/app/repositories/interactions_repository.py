from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from app.models.models import Interaction, Property


class InteractionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_interaction(self, interaction_data: dict) -> Interaction:
        weights = {"view": 1, "like": 5, "dislike": -5}
        interaction_data["weight"] = weights.get(
            interaction_data["interaction_type"], 1)

        interaction_obj = Interaction(**interaction_data)
        self.session.add(interaction_obj)
        await self.session.commit()
        await self.session.refresh(interaction_obj)
        return interaction_obj

    async def get_user_favorites(self, user_id: str):
        query = (
            select(Property)
            .join(Interaction, Property.id == Interaction.property_id)
            .filter(
                Interaction.user_id == user_id,
                Interaction.interaction_type == "like"
            )
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def find_interaction(self, user_id: str, property_id: str):
        query = select(Interaction).filter(
            Interaction.user_id == user_id,
            Interaction.property_id == property_id
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def remove_interaction(self, interaction_id: int):
        query = delete(Interaction).where(Interaction.id == interaction_id)
        result = await self.session.execute(query)
        await self.session.commit()
        return result.rowcount > 0
