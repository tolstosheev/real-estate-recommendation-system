
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import User
from app.schemas.property import PropertyOut
from app.services.recommendation_service import RecommendationService

router = APIRouter()


@router.get("/", response_model=list[PropertyOut])
async def get_recommendations(
    limit: int = Query(default=10, le=100), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    service = RecommendationService(db)
    return await service.recommend(str(current_user.id), limit=limit)
