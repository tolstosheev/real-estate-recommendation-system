from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.services.preferences_service import UserPreferenceService
from app.schemas.preferences import UserPreferenceCreate, UserPreferenceOut
from app.services.property_service import PropertyService
from app.services.auth_service import AuthService
from app.schemas.auth import UserOut, UserUpdate
from app.schemas.property import PropertyOut
from app.core.security import get_current_user, get_current_user_optional
from app.models.models import User
from typing import List

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


@router.get(
    "/properties",
    response_model=List[PropertyOut],
    summary="Get My Properties",
    description="Get properties of the current authenticated user",
)
async def get_my_properties(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    service = PropertyService(db)
    return await service.get_user_properties(str(current_user.id))


@router.put(
    "/profile",
    response_model=UserOut,
    summary="Update My Profile",
    description="Update profile of the current authenticated user",
)
async def update_my_profile(
    user_in: UserUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    updated_user = await service.update_user(str(current_user.id), user_in.model_dump(exclude_unset=True))
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user


@router.get(
    "/{user_id}",
    response_model=UserOut,
    summary="Get User by ID",
    description="Get user profile by ID",
)
async def get_user_by_id(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    user = await service.repository.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
