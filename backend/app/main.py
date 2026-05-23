import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.endpoints import auth, geocode, interactions, properties, recommendations, user
from app.api.endpoints.upload import router as upload_router
from app.core.config import settings
from app.core.db import Base, engine
from app.core.redis import RedisClient
from app.services.image_service import ImageService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.app_env != "production":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    image_service = ImageService()
    await image_service.ensure_bucket()
    yield
    await image_service.aclose()
    await RedisClient.close()
    await engine.dispose()


app = FastAPI(title="nestAI API", lifespan=lifespan)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception caught: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(properties.router, prefix="/api/properties", tags=["Properties"])
app.include_router(user.router, prefix="/user", tags=["User Profile"])
app.include_router(interactions.router, prefix="/api/interactions", tags=["Interactions"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(upload_router, prefix="/api", tags=["Images"])
app.include_router(geocode.router, prefix="/api", tags=["Geocoding"])


@app.get("/")
async def root():
    return {"message": "Welcome to nestAI API"}
