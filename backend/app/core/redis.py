import redis.asyncio as redis
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class RedisClient:
    _instance: Optional[redis.Redis] = None

    @classmethod
    async def get_client(cls) -> Optional[redis.Redis]:
        try:
            if cls._instance is not None:
                try:
                    await cls._instance.ping()
                except Exception:
                    cls._instance = None

            if cls._instance is None:
                redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
                cls._instance = redis.from_url(redis_url, decode_responses=True)
                await cls._instance.ping()
            return cls._instance
        except Exception as e:
            logger.error(f"Redis connection error: {e}")
            return None

    @classmethod
    async def clear_user_cache(cls, user_id: str):
        redis = await cls.get_client()
        if redis:
            await redis.delete(f"user_vec:{user_id}")
            keys = await redis.keys(f"user_recs:{user_id}:*")
            if keys:
                await redis.delete(*keys)

    @classmethod
    async def close(cls):
        if cls._instance:
            await cls._instance.close()
            cls._instance = None
