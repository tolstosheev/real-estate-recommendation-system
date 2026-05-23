
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import User
from app.schemas.interactions import InteractionCreate
from app.schemas.property import PropertyOut
from app.services.interactions_service import InteractionService
from app.services.property_service import PropertyService

router = APIRouter()


async def _enrich_and_mask(db: AsyncSession, rows: list, liked_set: set[str] | bool = False) -> list:
    prop_service = PropertyService(db)
    prop_ids = [str(row[0].id) for row in rows]
    prop_rows = await prop_service.repository.get_by_ids(prop_ids)
    enriched = await prop_service.batch_enrich(prop_rows)

    for p in enriched:
        if isinstance(liked_set, set):
            p.is_liked_by_me = str(p.id) in liked_set
        else:
            p.is_liked_by_me = bool(liked_set)
        if p.owner:
            p.owner.phone_number = None
            p.owner.telegram_handle = None

    return enriched


@router.post(
    "/interact", status_code=status.HTTP_201_CREATED, summary="Interact with Property", description="Like or view a property"
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
        raise HTTPException(status_code=404, detail=str(e)) from e

    if result["status"] == "removed":
        return JSONResponse(status_code=200, content={"status": "removed"})

    return JSONResponse(status_code=201, content={"status": result["status"]})


@router.get(
    "/favorites", response_model=list[PropertyOut], summary="Get My Favorites", description="List liked properties"
)
async def get_my_favorites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=100, le=200),
    offset: int = 0,
):
    service = InteractionService(db)
    rows = await service.get_favorites(current_user.id, limit, offset)

    if not rows:
        return []

    return await _enrich_and_mask(db, rows, liked_set=True)


@router.get(
    "/history", response_model=list[PropertyOut], summary="Get View History", description="List viewed properties"
)
async def get_my_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=100, le=200),
    offset: int = 0,
):
    service = InteractionService(db)
    rows = await service.get_view_history(current_user.id, limit, offset)

    if not rows:
        return []

    prop_ids = [str(row[0].id) for row in rows]
    liked_ids = await service.interaction_repo.batch_check_likes(current_user.id, prop_ids)
    return await _enrich_and_mask(db, rows, liked_set=liked_ids)
