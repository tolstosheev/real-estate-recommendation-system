import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestRedisClient:
    @pytest.mark.asyncio
    async def test_get_client_success(self):
        from app.core.redis import RedisClient
        RedisClient._instance = None
        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock(return_value=True)
        with patch("app.core.redis.redis.from_url", return_value=mock_redis):
            client = await RedisClient.get_client()
            assert client is not None
            RedisClient._instance = None

    @pytest.mark.asyncio
    async def test_get_client_reuses_instance(self):
        from app.core.redis import RedisClient
        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock(return_value=True)
        RedisClient._instance = mock_redis
        client = await RedisClient.get_client()
        assert client == mock_redis
        RedisClient._instance = None

    @pytest.mark.asyncio
    async def test_get_client_failure_returns_none(self):
        from app.core.redis import RedisClient
        RedisClient._instance = None
        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock(side_effect=Exception("Connection failed"))
        with patch("app.core.redis.redis.from_url", return_value=mock_redis):
            with patch("app.core.redis.logger"):
                client = await RedisClient.get_client()
                assert client is None
        RedisClient._instance = None

    @pytest.mark.asyncio
    async def test_clear_user_cache(self):
        from app.core.redis import RedisClient
        mock_redis = AsyncMock()
        mock_redis.delete = AsyncMock(return_value=True)
        mock_redis.keys = AsyncMock(return_value=["recs:key1", "recs:key2"])
        RedisClient._instance = mock_redis

        await RedisClient.clear_user_cache("user-1")
        mock_redis.delete.assert_any_call("user_vec:user-1")
        mock_redis.delete.assert_any_call("recs:key1", "recs:key2")
        RedisClient._instance = None

    @pytest.mark.asyncio
    async def test_clear_user_cache_no_redis(self):
        from app.core.redis import RedisClient
        RedisClient._instance = None
        with patch.object(RedisClient, "get_client", AsyncMock(return_value=None)):
            await RedisClient.clear_user_cache("user-1")
        RedisClient._instance = None

    @pytest.mark.asyncio
    async def test_close(self):
        from app.core.redis import RedisClient
        mock_redis = AsyncMock()
        mock_redis.aclose = AsyncMock()
        RedisClient._instance = mock_redis
        await RedisClient.close()
        mock_redis.aclose.assert_called_once()
        assert RedisClient._instance is None
