from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.services.interactions_service import InteractionService
from app.schemas.interactions import InteractionCreate
from app.schemas.property import PropertyOut
from app.core.security import get_current_user
from app.models.models import User
from typing import List

router = APIRouter()


@router.post(
    "/", status_code=status.HTTP_201_CREATED, summary="Interact with Property", description="Like or view a property"
)
async def interact_with_property(
    interaction_in: InteractionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InteractionService(db)
    try:
        result = await service.add_interaction(current_user.id, interaction_in.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    if result["status"] == "removed":
        return JSONResponse(status_code=200, content={"status": "removed"})

    return JSONResponse(status_code=201, content={"status": result["status"]})


@router.get(
    "/favorites", response_model=List[PropertyOut], summary="Get My Favorites", description="List liked properties"
)
async def get_my_favorites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
):
    service = InteractionService(db)
    favorites = await service.get_favorites(current_user.id, limit, offset)

    from app.services.property_service import PropertyService

    prop_service = PropertyService(db)

    enriched_favorites = []
    for prop in favorites:
        prop_data = await prop_service.get_property_details(str(prop.id))
        if prop_data:
            if isinstance(prop_data, dict):
                prop_data["is_liked_by_me"] = True
                enriched_favorites.append(PropertyOut(**prop_data))
            else:
                owner_data = None
                if hasattr(prop_data, "owner") and prop_data.owner:
                    owner_data = {
                        "id": str(prop_data.owner.id),
                        "full_name": prop_data.owner.full_name,
                        "phone_number": prop_data.owner.phone_number,
                        "telegram_handle": prop_data.owner.telegram_handle,
                    }
                prop_dict = {
                    "id": str(prop_data.id),
                    "title": prop_data.title,
                    "description": prop_data.description,
                    "price": float(prop_data.price) if prop_data.price else 0.0,
                    "rooms": prop_data.rooms,
                    "area": float(prop_data.area) if prop_data.area else None,
                    "floor": prop_data.floor,
                    "total_floors": prop_data.total_floors,
                    "property_type": prop_data.property_type,
                    "address": prop_data.address,
                    "lat": float(prop_data.lat) if getattr(prop_data, "lat", None) else 0.0,
                    "lon": float(prop_data.lon) if getattr(prop_data, "lon", None) else 0.0,
                    "images": list(prop_data.images) if prop_data.images else [],
                    "owner": owner_data,
                    "views_count": prop_data.views_count,
                    "likes_count": prop_data.likes_count,
                    "is_liked_by_me": True,
                }
                enriched_favorites.append(PropertyOut(**prop_dict))

    return enriched_favorites


@router.get(
    "/history", response_model=List[PropertyOut], summary="Get View History", description="List viewed properties"
)
async def get_my_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
):
    service = InteractionService(db)
    history = await service.get_view_history(current_user.id, limit, offset)

    from app.services.property_service import PropertyService

    prop_service = PropertyService(db)

    enriched_history = []
    for prop in history:
        prop_data = await prop_service.get_property_details(str(prop.id))
        if prop_data:
            if isinstance(prop_data, dict):
                liked = await service.interaction_repo.find_interaction(
                    str(current_user.id), str(prop.id), interaction_type="like"
                )
                prop_data["is_liked_by_me"] = liked is not None
                enriched_history.append(PropertyOut(**prop_data))
            else:
                owner_data = None
                if hasattr(prop_data, "owner") and prop_data.owner:
                    owner_data = {
                        "id": str(prop_data.owner.id),
                        "full_name": prop_data.owner.full_name,
                        "phone_number": prop_data.owner.phone_number,
                        "telegram_handle": prop_data.owner.telegram_handle,
                    }
                prop_dict = {
                    "id": str(prop_data.id),
                    "title": prop_data.title,
                    "description": prop_data.description,
                    "price": float(prop_data.price) if prop_data.price else 0.0,
                    "rooms": prop_data.rooms,
                    "area": float(prop_data.area) if prop_data.area else None,
                    "floor": prop_data.floor,
                    "total_floors": prop_data.total_floors,
                    "property_type": prop_data.property_type,
                    "address": prop_data.address,
                    "lat": float(prop_data.lat) if getattr(prop_data, "lat", None) else 0.0,
                    "lon": float(prop_data.lon) if getattr(prop_data, "lon", None) else 0.0,
                    "images": list(prop_data.images) if prop_data.images else [],
                    "owner": owner_data,
                    "views_count": prop_data.views_count,
                    "likes_count": prop_data.likes_count,
                }
                prop_out = PropertyOut(**prop_dict)
                liked = await service.interaction_repo.find_interaction(
                    str(current_user.id), str(prop.id), interaction_type="like"
                )
                prop_out.is_liked_by_me = liked is not None
                enriched_history.append(prop_out)

    return enriched_history
