
from collections import defaultdict

from sqlalchemy import delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models import Interaction, Property


class InteractionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_interaction(self, interaction_data: dict) -> Interaction:
        weights = {"view": 1, "like": 5}
        interaction_data["weight"] = weights.get(interaction_data["interaction_type"], 1)

        interaction_obj = Interaction(**interaction_data)
        self.session.add(interaction_obj)
        await self.session.flush()
        await self.session.refresh(interaction_obj)
        return interaction_obj

    async def get_user_favorites(self, user_id: str, limit: int = 100, offset: int = 0):
        query = (
            select(Property, func.ST_X(Property.location).label("lon"), func.ST_Y(Property.location).label("lat"))
            .join(Interaction, Property.id == Interaction.property_id)
        .filter(Interaction.user_id == user_id, Interaction.interaction_type == "like")
        .order_by(Interaction.created_at.desc())
        .offset(offset)
        .limit(limit)
        )
        result = await self.session.execute(query)
        return result.all()

    async def get_user_view_history(self, user_id: str, limit: int = 100, offset: int = 0):
        subq = (
            select(
                Interaction.property_id,
                func.max(Interaction.created_at).label("max_created")
            )
            .filter(
                Interaction.user_id == user_id,
                Interaction.interaction_type == "view"
            )
            .group_by(Interaction.property_id)
            .order_by(func.max(Interaction.created_at).desc())
            .offset(offset)
            .limit(limit)
            .subquery()
        )
        query = (
            select(Property, subq.c.max_created, func.ST_X(Property.location).label("lon"), func.ST_Y(Property.location).label("lat"))
            .join(subq, Property.id == subq.c.property_id)
            .order_by(subq.c.max_created.desc())
        )
        result = await self.session.execute(query)
        return result.all()

    async def find_interaction(self, user_id: str, property_id: str, interaction_type: str | None = None):
        query = select(Interaction).filter(Interaction.user_id == user_id, Interaction.property_id == property_id)
        if interaction_type:
            query = query.filter(Interaction.interaction_type == interaction_type)
        query = query.order_by(Interaction.created_at.desc())
        result = await self.session.execute(query)
        return result.first()

    async def batch_check_likes(self, user_id, property_ids: list) -> set[str]:
        if not property_ids:
            return set()
        query = select(Interaction.property_id).filter(
            Interaction.user_id == user_id,
            Interaction.property_id.in_(property_ids),
            Interaction.interaction_type == "like",
        )
        result = await self.session.execute(query)
        return {str(row[0]) for row in result.all()}

    async def get_users_liked_properties(self) -> dict[str, set[str]]:
        query = (
            select(Interaction.user_id, Interaction.property_id)
            .filter(Interaction.interaction_type == "like")
        )
        result = await self.session.execute(query)
        user_props: dict[str, set[str]] = defaultdict(set)
        for row in result.all():
            user_props[str(row[0])].add(str(row[1]))
        return dict(user_props)

    async def get_user_interacted_property_ids(self, user_id: str) -> set[str]:
        query = (
            select(Interaction.property_id)
            .filter(Interaction.user_id == user_id)
        )
        result = await self.session.execute(query)
        return {str(row[0]) for row in result.all()}

    async def remove_interaction(self, interaction_id: int):
        query = delete(Interaction).where(Interaction.id == interaction_id)
        result = await self.session.execute(query)
        return result.rowcount > 0
