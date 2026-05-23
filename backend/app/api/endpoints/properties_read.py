
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.models import User
from app.schemas.property import PropertyOut
from app.services.property_service import PropertyService

router = APIRouter()


@router.get(
    "/meta",
    summary="Get Property Meta",
    description="Get distinct values for filters (districts, metro, materials, repair_types)",
)
async def get_properties_meta(db: AsyncSession = Depends(get_db)):
    service = PropertyService(db)
    return await service.get_meta()


@router.get(
    "/map",
    response_model=list[PropertyOut],
    summary="Get Properties in BBox",
    description="Returns properties in bounding box with filters",
)
async def get_properties_map(
    min_lat: float = Query(...),
    max_lat: float = Query(...),
    min_lon: float = Query(...),
    max_lon: float = Query(...),
    min_price: float | None = None,
    max_price: float | None = None,
    rooms: list[int] | None = Query(None),
    property_type: list[str] | None = Query(None),
    property_purpose: list[str] | None = Query(None),
    district: str | None = None,
    metro: str | None = None,
    material: list[str] | None = Query(None),
    repair_type: list[str] | None = Query(None),
    min_build_year: int | None = None,
    max_build_year: int | None = None,
    city: list[str] | None = Query(None),
    min_area: float | None = None,
    max_area: float | None = None,
    is_new: list[str] | None = Query(None),
    limit: int = Query(default=50, le=200),
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
        await service.enrich_with_likes(result, str(current_user.id))

    return result


@router.get(
    "/",
    response_model=list[PropertyOut],
    summary="List Properties",
    description="List properties with filters and spatial search",
)
async def get_properties(
    limit: int = Query(default=100, le=200),
    offset: int = 0,
    min_price: float | None = None,
    max_price: float | None = None,
    rooms: list[int] | None = Query(None),
    property_type: list[str] | None = Query(None),
    property_purpose: list[str] | None = Query(None),
    district: str | None = None,
    metro: str | None = None,
    material: list[str] | None = Query(None),
    repair_type: list[str] | None = Query(None),
    min_build_year: int | None = None,
    max_build_year: int | None = None,
    city: list[str] | None = Query(None),
    lat: float | None = None,
    lon: float | None = None,
    radius_km: float | None = None,
    search: str | None = None,
    min_area: float | None = None,
    max_area: float | None = None,
    is_new: list[str] | None = Query(None),
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
        await service.enrich_with_likes(properties, str(current_user.id))

    return properties


@router.get(
    "/my",
    response_model=list[PropertyOut],
    summary="Get My Properties",
    description="Get properties created by current user",
)
async def get_my_properties(
    limit: int = Query(default=100, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PropertyService(db)
    return await service.get_user_properties(str(current_user.id), limit, offset)


@router.get(
    "/{property_id}", response_model=PropertyOut, summary="Get Property Details", description="Get property by ID"
)
async def get_property(
    property_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    property_id_str = str(property_id)
    service = PropertyService(db)
    property_obj = await service.get_property_details(
        property_id_str,
        current_user_id=str(current_user.id) if current_user else None,
    )
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")

    return property_obj
