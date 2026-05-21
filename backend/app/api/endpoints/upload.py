import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from app.core.security import get_current_user
from app.models.models import User
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
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload images")


@router.get("/images/{filename:path}", summary="Serve image", description="Get image from MinIO")
async def serve_image(filename: str):
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
        raise HTTPException(status_code=500, detail="Failed to serve image")


@router.delete("/images/{filename:path}", status_code=204, summary="Delete image", description="Delete image from MinIO")
async def delete_image(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    try:
        await image_service.delete(filename)
    except Exception as e:
        logger.error(f"Failed to delete image {filename}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete image")
