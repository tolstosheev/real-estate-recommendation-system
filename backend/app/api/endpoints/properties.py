from fastapi import APIRouter
from app.api.endpoints.properties_read import router as read_router
from app.api.endpoints.properties_write import router as write_router

router = APIRouter()
router.include_router(read_router)
router.include_router(write_router)
