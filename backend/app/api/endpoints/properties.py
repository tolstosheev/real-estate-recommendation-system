from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.services.property_service import PropertyService
from app.schemas.property import PropertyCreate, PropertyUpdate, PropertyOut
from app.core.security import get_current_user
from app.models.models import User
from typing import List, Optional

router = APIRouter()


@router.get(
    "/map",
    response_model=List[PropertyOut],
    summary="Get Properties in BBox",
    description="Returns properties in bounding box with filters",
)
async def get_properties_map(
    min_lat: float = Query(...),
    max_lat: float = Query(...),
    min_lon: float = Query(...),
    max_lon: float = Query(...),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    rooms: Optional[int] = None,
    property_type: Optional[str] = None,
    property_purpose: Optional[str] = None,
    district: Optional[str] = None,
    metro: Optional[str] = None,
    material: Optional[str] = None,
    repair_type: Optional[str] = None,
    min_build_year: Optional[int] = None,
    max_build_year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    service = PropertyService(db)
    properties = await service.get_properties_in_bbox(min_lat, max_lat, min_lon, max_lon)

    if min_price is not None:
        properties = [p for p in properties if p.price >= min_price]
    if max_price is not None:
        properties = [p for p in properties if p.price <= max_price]
    if rooms is not None:
        properties = [p for p in properties if p.rooms == rooms]
    if property_type is not None:
        properties = [p for p in properties if p.property_type == property_type]
    if property_purpose is not None:
        properties = [p for p in properties if p.property_purpose == property_purpose]
    if district is not None:
        properties = [p for p in properties if p.district == district]
    if metro is not None:
        properties = [p for p in properties if p.metro == metro]
    if material is not None:
        properties = [p for p in properties if p.material == material]
    if repair_type is not None:
        properties = [p for p in properties if p.repair_type == repair_type]
    if min_build_year is not None:
        properties = [p for p in properties if p.build_year and p.build_year >= min_build_year]
    if max_build_year is not None:
        properties = [p for p in properties if p.build_year and p.build_year <= max_build_year]

    return properties


@router.get(
    "/",
    response_model=List[PropertyOut],
    summary="List Properties",
    description="List properties with filters and spatial search",
)
async def get_properties(
    limit: int = 100,
    offset: int = 0,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    rooms: Optional[int] = None,
    property_type: Optional[str] = None,
    property_purpose: Optional[str] = None,
    district: Optional[str] = None,
    metro: Optional[str] = None,
    material: Optional[str] = None,
    repair_type: Optional[str] = None,
    min_build_year: Optional[int] = None,
    max_build_year: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    radius_km: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
):
    service = PropertyService(db)
    properties = await service.list_properties(
        limit, offset, min_price, max_price, rooms, property_type, lat, lon, radius_km,
        district, metro, material, repair_type, min_build_year, max_build_year, property_purpose
    )
    return properties


@router.get(
    "/{property_id}", response_model=PropertyOut, summary="Get Property Details", description="Get property by ID"
)
async def get_property(property_id: str, db: AsyncSession = Depends(get_db)):
    service = PropertyService(db)
    property_obj = await service.get_property_details(property_id)
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    return property_obj


@router.post(
    "/",
    response_model=PropertyOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create Property",
    description="Create new property listing",
)
async def create_property(
    property_in: PropertyCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    service = PropertyService(db)
    data = property_in.model_dump()
    data["user_id"] = current_user.id
    try:
        return await service.create_property(data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.put(
    "/{property_id}", response_model=PropertyOut, summary="Update Property", description="Update property details"
)
async def update_property(
    property_id: str,
    property_in: PropertyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PropertyService(db)
    result = await service.repository.get_by_id(property_id)
    if not result:
        raise HTTPException(status_code=404, detail="Property not found")

    property_obj = result[0]
    if property_obj.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this property")

    return await service.update_property(property_id, property_in.model_dump(exclude_unset=True))


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
    result = await service.repository.get_by_id(property_id)
    if not result:
        raise HTTPException(status_code=404, detail="Property not found")

    property_obj = result[0]
    if property_obj.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this property")

    if not await service.delete_property(property_id):
        raise HTTPException(status_code=404, detail="Property not found")
    return None
