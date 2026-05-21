import logging
import os

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import Property, User
from app.services.image_service import ImageService

logger = logging.getLogger(__name__)
router = APIRouter()
image_service = ImageService()


@router.post("/upload/", summary="Upload images", description="Upload property images to MinIO")
async def upload_images(
    files: list[UploadFile] = File(..., description="Image files (jpg, png, webp, max 10MB each, max 10 files)"),
    current_user: User = Depends(get_current_user),
):
    try:
        urls = await image_service.upload_multiple(files)
        return {"urls": urls, "count": len(urls)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload images") from e


@router.get("/images/{filename:path}", summary="Serve image", description="Get image from MinIO")
async def serve_image(filename: str):
    filename = os.path.basename(filename)
    if not filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    try:
        data = await image_service.get_file(filename)
        if data is None:
            raise HTTPException(status_code=404, detail="Image not found")

        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        content_types = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
        }
        content_type = content_types.get(ext, "application/octet-stream")

        return Response(content=data, media_type=content_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to serve image {filename}: {e}")
        raise HTTPException(status_code=500, detail="Failed to serve image") from e


@router.delete("/images/{filename:path}", status_code=204, summary="Delete image", description="Delete image from MinIO")
async def delete_image(
    filename: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filename = os.path.basename(filename)
    if not filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    image_url = f"/api/images/{filename}"
    result = await db.execute(
        select(Property).where(Property.images.any(image_url))
    )
    found_props = result.scalars().all()
    if found_props:
        owned = any(str(p.user_id) == str(current_user.id) for p in found_props)
        if not owned:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to delete this image",
            )

    try:
        await image_service.delete(filename)
    except Exception as e:
        logger.error(f"Failed to delete image {filename}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete image") from e
