from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.services.property_service import PropertyService
from app.schemas.property import PropertyCreate, PropertyUpdate, PropertyOut
from app.core.security import get_current_user
from app.models.models import User
from typing import List, Optional

router = APIRouter()

@router.get("/map", response_model=List[PropertyOut], summary="Get Properties in BBox", description="Returns properties within the specified bounding box for map display")
async def get_properties_map(
    min_lat: float = Query(...), 
    max_lat: float = Query(...), 
    min_lon: float = Query(...), 
    max_lon: float = Query(...), 
    db: AsyncSession = Depends(get_db)
):
    service = PropertyService(db)
    return await service.get_properties_in_bbox(min_lat, max_lat, min_lon, max_lon)

@router.get("/", response_model=List[PropertyOut], summary="List Properties", description="Returns a list of properties with optional filters (price, rooms, type) and spatial search (radius)")
async def get_properties(
    limit: int = 100, 
    offset: int = 0, 
    min_price: Optional[float] = None, 
    max_price: Optional[float] = None, 
    rooms: Optional[int] = None, 
    property_type: Optional[str] = None, 
    lat: Optional[float] = None, 
    lon: Optional[float] = None, 
    radius_km: Optional[float] = None, 
    db: AsyncSession = Depends(get_db)
):
    service = PropertyService(db)
    return await service.list_properties(limit, offset, min_price, max_price, rooms, property_type, lat, lon, radius_km)

@router.get("/{property_id}", response_model=PropertyOut, summary="Get Property Details", description="Returns detailed information about a specific property by its ID")
async def get_property(property_id: str, db: AsyncSession = Depends(get_db)):
    service = PropertyService(db)
    property_obj = await service.get_property_details(property_id)
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    return property_obj

@router.post("/", response_model=PropertyOut, status_code=status.HTTP_201_CREATED, summary="Create Property", description="Allows the authenticated user to post a new property listing")
async def create_property(
    property_in: PropertyCreate, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    service = PropertyService(db)
    data = property_in.model_dump()
    data["user_id"] = current_user.id
    return await service.create_property(data)

@router.put("/{property_id}", response_model=PropertyOut, summary="Update Property", description="Allows the owner of the property to update its details")
async def update_property(
    property_id: str, 
    property_in: PropertyUpdate, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    service = PropertyService(db)
    property_obj = await service.get_property_details(property_id)
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property_obj.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this property")
    
    return await service.update_property(property_id, property_in.model_dump(exclude_unset=True))

@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Property", description="Allows the owner to remove their property listing from the system")
async def delete_property(
    property_id: str, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    service = PropertyService(db)
    property_obj = await service.get_property_details(property_id)
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
        
    if property_obj.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this property")
        
    if not await service.delete_property(property_id):
        raise HTTPException(status_code=404, detail="Property not found")
    return None
