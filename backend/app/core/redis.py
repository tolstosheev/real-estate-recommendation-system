import asyncio
import contextlib
import logging

import redis.asyncio as redis

from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    _instance: redis.Redis | None = None
    _lock = asyncio.Lock()

    @classmethod
    async def get_client(cls) -> redis.Redis | None:
        async with cls._lock:
            try:
                if cls._instance is not None:
                    try:
                        await cls._instance.ping()  # type: ignore[misc]
                    except Exception as e:
                        logger.warning(f"Redis ping failed, reconnecting: {e}")
                        cls._instance = None

                if cls._instance is None:
                    redis_url = settings.REDIS_URL
                    cls._instance = redis.from_url(redis_url, decode_responses=True)
                    await cls._instance.ping()  # type: ignore[misc]
                return cls._instance
            except Exception as e:
                logger.error(f"Redis connection error: {e}")
                return None

    @classmethod
    async def clear_user_cache(cls, user_id: str):
        redis = await cls.get_client()
        if redis:
            await redis.delete(f"user_vec:{user_id}")
            async for key in redis.scan_iter(match=f"user_recs:{user_id}:*"):
                await redis.delete(key)

    @classmethod
    async def clear_property_cache(cls, property_ids: list[str]):
        redis = await cls.get_client()
        if redis and property_ids:
            keys = [f"prop_details:{pid}" for pid in property_ids]
            await redis.delete(*keys)

    @classmethod
    async def close(cls):
        if cls._instance:
            with contextlib.suppress(RuntimeError):
                await cls._instance.aclose()
            cls._instance = None
