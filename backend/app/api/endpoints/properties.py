from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import distinct, select
from app.core.db import get_db
from app.services.property_service import PropertyService
from app.schemas.property import PropertyCreate, PropertyUpdate, PropertyOut
from app.core.security import get_current_user
from app.models.models import User, Property
from typing import List, Optional

router = APIRouter()


@router.get(
    "/meta",
    summary="Get Property Meta",
    description="Get distinct values for filters (districts, metro, materials, repair_types)",
)
async def get_properties_meta(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import distinct, select

    districts = (await db.execute(select(distinct(Property.district)).where(Property.district.isnot(None)))).scalars().all()
    metro = (await db.execute(select(distinct(Property.metro)).where(Property.metro.isnot(None)))).scalars().all()
    materials = (await db.execute(select(distinct(Property.material)).where(Property.material.isnot(None)))).scalars().all()
    repair_types = (await db.execute(select(distinct(Property.repair_type)).where(Property.repair_type.isnot(None)))).scalars().all()
    property_types = (await db.execute(select(distinct(Property.property_type)).where(Property.property_type.isnot(None)))).scalars().all()
    cities = (await db.execute(select(distinct(Property.city)).where(Property.city.isnot(None)).order_by(Property.city))).scalars().all()

    return {
        "districts": [d for d in districts if d],
        "metro": [m for m in metro if m],
        "materials": [m for m in materials if m],
        "repair_types": [r for r in repair_types if r],
        "property_types": [p for p in property_types if p],
        "cities": [c for c in cities if c],
    }


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
    city: Optional[str] = None,
    min_area: Optional[float] = None,
    max_area: Optional[float] = None,
    is_new: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
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
    if city is not None:
        properties = [p for p in properties if p.city == city]
    if min_area is not None:
        properties = [p for p in properties if p.area and p.area >= min_area]
    if max_area is not None:
        properties = [p for p in properties if p.area and p.area <= max_area]
    if is_new is not None:
        properties = [p for p in properties if p.is_new == is_new]

    return properties[offset:offset + limit]


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
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    radius_km: Optional[float] = None,
    search: Optional[str] = None,
    min_area: Optional[float] = None,
    max_area: Optional[float] = None,
    is_new: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    service = PropertyService(db)
    properties = await service.list_properties(
        limit, offset, min_price, max_price, rooms, property_type, lat, lon, radius_km,
        district, metro, material, repair_type, min_build_year, max_build_year, city, property_purpose,
        search, min_area, max_area, is_new,
    )
    return properties


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


@router.get(
    "/my",
    response_model=List[PropertyOut],
    summary="Get My Properties",
    description="Get properties created by current user",
)
async def get_my_properties(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    service = PropertyService(db)
    return await service.get_user_properties(str(current_user.id))


@router.get(
    "/{property_id}", response_model=PropertyOut, summary="Get Property Details", description="Get property by ID"
)
async def get_property(property_id: str, db: AsyncSession = Depends(get_db)):
    service = PropertyService(db)
    property_obj = await service.get_property_details(property_id)
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    return property_obj


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
