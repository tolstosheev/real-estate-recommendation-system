from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.services.preferences_service import UserPreferenceService
from app.schemas.preferences import UserPreferenceCreate, UserPreferenceOut
from app.core.security import get_current_user
from app.models.models import User

router = APIRouter()

@router.get("/preferences", response_model=UserPreferenceOut)
async def get_my_preferences(
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    service = UserPreferenceService(db)
    prefs = await service.get_preferences(current_user.id)
    if not prefs:
        raise HTTPException(status_code=404, detail="Preferences not set")
    return prefs

@router.put("/preferences", response_model=UserPreferenceOut, status_code=status.HTTP_200_OK)
async def update_my_preferences(
    pref_in: UserPreferenceCreate, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    service = UserPreferenceService(db)
    return await service.set_preferences(current_user.id, pref_in.model_dump())
