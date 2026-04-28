from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.services.interactions_service import InteractionService
from app.schemas.interactions import InteractionCreate, InteractionOut
from app.schemas.property import PropertyOut
from app.core.security import get_current_user
from app.models.models import User
from typing import List

router = APIRouter()

@router.post("/interact", response_model=InteractionOut, status_code=status.HTTP_201_CREATED)
async def interact_with_property(
    interaction_in: InteractionCreate, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    service = InteractionService(db)
    try:
        result = await service.add_interaction(current_user.id, interaction_in.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
        
    if result["status"] == "removed":
        raise HTTPException(status_code=204, detail="Interaction removed")
    if result["status"] == "exists":
        return result["interaction"]
    return result["interaction"]

@router.get("/favorites", response_model=List[PropertyOut])
async def get_my_favorites(
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    service = InteractionService(db)
    favorites = await service.get_favorites(current_user.id)
    
    from app.services.property_service import PropertyService
    prop_service = PropertyService(db)
    
    enriched_favorites = []
    for prop in favorites:
        result = await prop_service.get_property_details(str(prop.id))
        enriched_favorites.append(result)
        
    return enriched_favorites

