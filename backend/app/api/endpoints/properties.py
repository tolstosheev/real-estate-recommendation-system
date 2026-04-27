from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.services.property_service import PropertyService
from typing import List

router = APIRouter()

@router.get("/")
async def get_properties(limit: int = 100, offset: int = 0, db: AsyncSession = Depends(get_db)):
    service = PropertyService(db)
    return await service.list_properties(limit, offset)

@router.get("/{property_id}")
async def get_property(property_id: str, db: AsyncSession = Depends(get_db)):
    service = PropertyService(db)
    property_obj = await service.get_property_details(property_id)
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    return property_obj
