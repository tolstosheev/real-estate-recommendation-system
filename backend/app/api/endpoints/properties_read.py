from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import distinct, select, func
from app.core.db import get_db
from app.services.property_service import PropertyService
from app.schemas.property import PropertyOut
from app.core.security import get_current_user, get_current_user_optional
from app.models import User, Property
from app.repositories.interactions_repository import InteractionRepository
from typing import List, Optional

router = APIRouter()


@router.get(
    "/meta",
    summary="Get Property Meta",
    description="Get distinct values for filters (districts, metro, materials, repair_types)",
)
async def get_properties_meta(db: AsyncSession = Depends(get_db)):

    districts = (await db.execute(select(distinct(Property.district)).where(Property.district.isnot(None)))).scalars().all()
    metro = (await db.execute(select(distinct(Property.metro)).where(Property.metro.isnot(None)))).scalars().all()
    materials = (await db.execute(select(distinct(Property.material)).where(Property.material.isnot(None)))).scalars().all()
    repair_types = (await db.execute(select(distinct(Property.repair_type)).where(Property.repair_type.isnot(None)))).scalars().all()
    property_types = (await db.execute(select(distinct(Property.property_type)).where(Property.property_type.isnot(None)))).scalars().all()
    cities = (await db.execute(select(distinct(Property.city)).where(Property.city.isnot(None)).order_by(Property.city))).scalars().all()

    city_centers_raw = (await db.execute(
        select(
            Property.city,
            func.avg(func.ST_Y(Property.location)).label("lat"),
            func.avg(func.ST_X(Property.location)).label("lon"),
        ).where(Property.city.isnot(None)).group_by(Property.city)
    )).all()
    city_centers = {row.city: [float(row.lon), float(row.lat)] for row in city_centers_raw}

    return {
        "districts": [d for d in districts if d],
        "metro": [m for m in metro if m],
        "materials": [m for m in materials if m],
        "repair_types": [r for r in repair_types if r],
        "property_types": [p for p in property_types if p],
        "cities": [c for c in cities if c],
        "city_centers": city_centers,
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
    rooms: Optional[List[int]] = Query(None),
    property_type: Optional[List[str]] = Query(None),
    property_purpose: Optional[List[str]] = Query(None),
    district: Optional[str] = None,
    metro: Optional[str] = None,
    material: Optional[List[str]] = Query(None),
    repair_type: Optional[List[str]] = Query(None),
    min_build_year: Optional[int] = None,
    max_build_year: Optional[int] = None,
    city: Optional[List[str]] = Query(None),
    min_area: Optional[float] = None,
    max_area: Optional[float] = None,
    is_new: Optional[List[str]] = Query(None),
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    service = PropertyService(db)
    result = await service.get_properties_in_bbox(
        min_lat, max_lat, min_lon, max_lon,
        min_price=min_price, max_price=max_price,
        rooms=rooms, property_type=property_type,
        property_purpose=property_purpose,
        district=district, metro=metro,
        material=material, repair_type=repair_type,
        min_build_year=min_build_year, max_build_year=max_build_year,
        city=city, min_area=min_area, max_area=max_area,
        is_new=is_new, limit=limit, offset=offset,
    )

    if current_user and result:
        repo = InteractionRepository(db)
        liked_ids = await repo.batch_check_likes(current_user.id, [str(p.id) for p in result])
        for p in result:
            if str(p.id) in liked_ids:
                p.is_liked_by_me = True

    return result


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
    rooms: Optional[List[int]] = Query(None),
    property_type: Optional[List[str]] = Query(None),
    property_purpose: Optional[List[str]] = Query(None),
    district: Optional[str] = None,
    metro: Optional[str] = None,
    material: Optional[List[str]] = Query(None),
    repair_type: Optional[List[str]] = Query(None),
    min_build_year: Optional[int] = None,
    max_build_year: Optional[int] = None,
    city: Optional[List[str]] = Query(None),
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    radius_km: Optional[float] = None,
    search: Optional[str] = None,
    min_area: Optional[float] = None,
    max_area: Optional[float] = None,
    is_new: Optional[List[str]] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    service = PropertyService(db)
    properties = await service.list_properties(
        limit, offset, min_price, max_price, rooms, property_type, lat, lon, radius_km,
        district, metro, material, repair_type, min_build_year, max_build_year, city, property_purpose,
        search, min_area, max_area, is_new,
    )

    if current_user and properties:
        repo = InteractionRepository(db)
        liked_ids = await repo.batch_check_likes(current_user.id, [str(p.id) for p in properties])
        for p in properties:
            if str(p.id) in liked_ids:
                p.is_liked_by_me = True

    return properties


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
async def get_property(
    property_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    service = PropertyService(db)
    property_obj = await service.get_property_details(property_id)
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")

    if current_user:
        repo = InteractionRepository(db)
        liked = await repo.find_interaction(current_user.id, property_id, "like")
        if isinstance(property_obj, dict):
            property_obj["is_liked_by_me"] = liked is not None
        else:
            property_obj.is_liked_by_me = liked is not None

    return property_obj
