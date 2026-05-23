from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import User
from app.schemas.property import PropertyCreate, PropertyOut, PropertyUpdate
from app.services.property_service import PropertyService

router = APIRouter()


@router.post(
    "/",
    response_model=PropertyOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create Property",
    description="Create a new property listing",
)
async def create_property(
    property_data: PropertyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PropertyService(db)
    prop_dict = property_data.model_dump()
    prop_dict["user_id"] = str(current_user.id)
    return await service.create_property(prop_dict)


@router.put(
    "/{property_id}",
    response_model=PropertyOut,
    summary="Update Property",
    description="Update an existing property listing",
)
async def update_property(
    property_id: str,
    property_data: PropertyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PropertyService(db)
    prop = await service.get_owned_property(property_id, str(current_user.id))
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found or not authorized")

    update_dict = property_data.model_dump(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")

    updated = await service.update_property(property_id, update_dict)
    return updated


@router.delete(
    "/{property_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Property",
    description="Delete property listing",
)
async def delete_property(
    property_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    service = PropertyService(db)
    prop = await service.get_owned_property(property_id, str(current_user.id))
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found or not authorized")

    if not await service.delete_property(property_id):
        raise HTTPException(status_code=404, detail="Property not found")
    return None
