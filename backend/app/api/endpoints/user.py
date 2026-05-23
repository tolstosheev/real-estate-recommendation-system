
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import User
from app.schemas.preferences import UserPreferenceCreate, UserPreferenceOut
from app.services.preferences_service import UserPreferenceService

router = APIRouter()


@router.get(
    "/preferences",
    response_model=UserPreferenceOut,
    summary="Get User Preferences",
    description="Get search preferences of current user",
)
async def get_my_preferences(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = UserPreferenceService(db)
    prefs = await service.get_preferences(current_user.id)
    if not prefs:
        raise HTTPException(status_code=404, detail="Preferences not set")
    return prefs


@router.put(
    "/preferences",
    response_model=UserPreferenceOut,
    status_code=status.HTTP_200_OK,
    summary="Update User Preferences",
    description="Set or update search preferences",
)
async def update_my_preferences(
    pref_in: UserPreferenceCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    service = UserPreferenceService(db)
    return await service.set_preferences(current_user.id, pref_in.model_dump())
