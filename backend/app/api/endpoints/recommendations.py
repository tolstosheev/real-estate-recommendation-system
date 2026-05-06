from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.services.recommendation_service import RecommendationService
from app.schemas.property import PropertyOut
from app.core.security import get_current_user
from app.models.models import User
from typing import List

router = APIRouter()


@router.get("/", response_model=List[PropertyOut])
async def get_recommendations(
    limit: int = 10, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    service = RecommendationService(db)
    recommendations = await service.recommend(current_user.id, limit=limit)

    from app.services.property_service import PropertyService

    prop_service = PropertyService(db)

    enriched_recs = []
    for prop in recommendations:
        res = await prop_service.get_property_details(str(prop.id))
        enriched_recs.append(res)

    return enriched_recs
