
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import User
from app.repositories.interactions_repository import InteractionRepository
from app.schemas.property import PropertyOut
from app.services.recommendation_service import RecommendationService

router = APIRouter()


@router.get("/", response_model=list[PropertyOut])
async def get_recommendations(
    limit: int = Query(default=10, le=100), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    service = RecommendationService(db)
    recommendations = await service.recommend(current_user.id, limit=limit)

    from app.repositories.user_repository import UserRepository
    from app.services.property_service import PropertyService

    prop_service = PropertyService(db)
    prop_ids = [str(p.id) for p in recommendations]
    rows = await prop_service.repository.get_by_ids(prop_ids)
    rows_map = {str(row[0].id): row for row in rows}

    user_ids = {str(row[0].user_id) for row in rows if row[0].user_id}
    users = {}
    if user_ids:
        user_repo = UserRepository(db)
        users = await user_repo.get_by_ids(list(user_ids))

    enriched_recs = []
    for pid in prop_ids:
        row = rows_map.get(pid)
        if row:
            prop_obj = row[0]
            prop_obj.lat = row[1] if len(row) > 1 else None
            prop_obj.lon = row[2] if len(row) > 2 else None
            uid = str(prop_obj.user_id) if prop_obj.user_id else None
            prop_obj.owner = users.get(uid) if uid else None
            enriched_recs.append(prop_obj)

    if enriched_recs:
        repo = InteractionRepository(db)
        liked_ids = await repo.batch_check_likes(current_user.id, [str(p.id) for p in enriched_recs])
        for p in enriched_recs:
            if str(p.id) in liked_ids:
                p.is_liked_by_me = True

    return enriched_recs
