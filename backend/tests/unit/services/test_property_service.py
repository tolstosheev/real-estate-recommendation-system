import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from decimal import Decimal
from app.services.property_service import PropertyService, DecimalEncoder


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def service(mock_session):
    s = PropertyService(mock_session)
    s.repository = AsyncMock()
    s.user_repo = AsyncMock()
    s.geocoder = AsyncMock()
    return s


class TestDecimalEncoder:
    @pytest.mark.parametrize("value, expected", [
        (Decimal("10.5"), 10.5),
        (Decimal("0"), 0.0),
        (Decimal("-3.14"), -3.14),
    ])
    def test_decimal_encoder(self, value, expected):
        result = DecimalEncoder().default(value)
        assert result == expected

    def test_decimal_encoder_fallback(self):
        with pytest.raises(TypeError):
            DecimalEncoder().default(object())


class TestBatchEnrich:
    @pytest.mark.parametrize("results, user_ids, expected_count", [
        ([], set(), 0),
        (
            [(MagicMock(id="p1", user_id="u1", lat=None, lon=None), 10.0, 20.0)],
            {"u1"},
            1,
        ),
        (
            [
                (MagicMock(id="p1", user_id="u1", lat=None, lon=None), 10.0, 20.0),
                (MagicMock(id="p2", user_id="u2", lat=None, lon=None), 30.0, 40.0),
            ],
            {"u1", "u2"},
            2,
        ),
        (
            [MagicMock(id="p1", user_id="u1", lat=None, lon=None)],
            {"u1"},
            1,
        ),
    ])
    @pytest.mark.asyncio
    async def test_batch_enrich(self, service, results, user_ids, expected_count):
        service.user_repo.get_by_ids = AsyncMock(return_value={
            uid: MagicMock(id=uid, full_name=f"User {uid}")
            for uid in user_ids
        })
        enriched = await service.batch_enrich(results)
        assert len(enriched) == expected_count


class TestCreateProperty:
    @pytest.mark.asyncio
    async def test_create_with_coords(self, service):
        service.repository.create = AsyncMock(return_value=MagicMock(id="p1"))
        service.repository.get_by_id = AsyncMock(return_value=(MagicMock(id="p1", user_id="u1"), 10.0, 20.0))
        service.user_repo.get_by_ids = AsyncMock(return_value={"u1": MagicMock(full_name="Owner")})
        result = await service.create_property({
            "title": "Test", "price": 100, "lat": 55.0, "lon": 37.0,
        })
        assert result is not None

    @pytest.mark.asyncio
    async def test_create_with_address_fallback(self, service):
        service.geocoder.get_coords_from_address = AsyncMock(return_value=(55.75, 37.61))
        service.repository.create = AsyncMock(return_value=MagicMock(id="p2"))
        service.repository.get_by_id = AsyncMock(return_value=(MagicMock(id="p2", user_id="u1"), 55.75, 37.61))
        service.user_repo.get_by_ids = AsyncMock(return_value={"u1": MagicMock(full_name="Owner")})
        result = await service.create_property({
            "title": "Test", "price": 100, "address": "Moscow Street",
        })
        assert result is not None

    @pytest.mark.asyncio
    async def test_create_no_coords_no_address(self, service):
        with pytest.raises(ValueError, match="Coordinates are required"):
            await service.create_property({"title": "Test", "price": 100})

    @pytest.mark.parametrize("lat, lon", [
        (100, 0),
        (-100, 0),
        (0, 200),
        (0, -200),
    ])
    @pytest.mark.asyncio
    async def test_create_invalid_coords(self, service, lat, lon):
        with pytest.raises(ValueError, match="Invalid coordinates"):
            await service.create_property({
                "title": "Test", "price": 100, "lat": lat, "lon": lon,
            })

    @pytest.mark.asyncio
    async def test_create_geocoder_fails_no_address(self, service):
        service.geocoder.get_coords_from_address = AsyncMock(return_value=None)
        with pytest.raises(ValueError, match="Coordinates are required"):
            await service.create_property({
                "title": "Test", "price": 100, "address": "Unknown Place",
            })


class TestGetPropertyDetails:
    @pytest.mark.asyncio
    async def test_get_details_no_cache(self, service):
        service.repository.get_by_id = AsyncMock(return_value=(MagicMock(id="p1", user_id="u1", price=Decimal("100")), 10.0, 20.0))
        service.user_repo.get_by_ids = AsyncMock(return_value={"u1": MagicMock(full_name="Owner")})
        with patch.object(service, "_get_redis", AsyncMock(return_value=None)):
            result = await service.get_property_details("p1")
            assert result is not None

    @pytest.mark.asyncio
    async def test_get_details_cached(self, service):
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value='{"id":"p1","title":"Cached"}')
        with patch.object(service, "_get_redis", AsyncMock(return_value=mock_redis)):
            result = await service.get_property_details("p1")
            assert result["id"] == "p1"


class TestOtherMethods:
    @pytest.mark.asyncio
    async def test_update_property(self, service):
        service.repository.update = AsyncMock(return_value=(MagicMock(id="p1", user_id="u1"), 0, 0))
        service.user_repo.get_by_ids = AsyncMock(return_value={"u1": MagicMock(full_name="Owner")})
        result = await service.update_property("p1", {"title": "Updated"})
        assert result is not None

    @pytest.mark.asyncio
    async def test_delete_property(self, service):
        service.repository.delete = AsyncMock(return_value=True)
        result = await service.delete_property("p1")
        assert result is True

    @pytest.mark.asyncio
    async def test_get_cache_key(self, service):
        key = service._get_cache_key("test", a=1, b=2)
        assert key.startswith("test:")
        assert len(key) > 5

    @pytest.mark.asyncio
    async def test_get_redis_creates_client(self, service):
        with patch("app.services.property_service.RedisClient.get_client", AsyncMock(return_value="fake-redis")):
            result = await service._get_redis()
            assert result == "fake-redis"

    @pytest.mark.asyncio
    async def test_get_redis_reuses_client(self, service):
        service.redis = "existing-redis"
        result = await service._get_redis()
        assert result == "existing-redis"
