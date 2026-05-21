import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def service(mock_session):
    from app.services.interactions_service import InteractionService
    return InteractionService(mock_session)


class TestAddInteraction:
    @pytest.mark.asyncio
    async def test_property_not_found(self, service):
        service.property_repo.get_by_id = AsyncMock(return_value=None)
        with pytest.raises(ValueError, match="Property not found"):
            await service.add_interaction("u1", {"interaction_type": "view", "property_id": "p1"})

    @pytest.mark.asyncio
    async def test_new_view_interaction(self, service):
        prop = MagicMock(views_count=0, likes_count=0)
        service.property_repo.get_by_id = AsyncMock(return_value=(prop, 0.0, 0.0))
        service.interaction_repo.find_interaction = AsyncMock(return_value=None)
        service.interaction_repo.create_interaction = AsyncMock(return_value=MagicMock())
        with patch("app.services.interactions_service.RedisClient.clear_user_cache", AsyncMock()):
            result = await service.add_interaction("u1", {"interaction_type": "view", "property_id": "p1"})
        assert result["status"] == "created"

    @pytest.mark.asyncio
    async def test_new_like_interaction(self, service):
        prop = MagicMock(views_count=0, likes_count=0)
        service.property_repo.get_by_id = AsyncMock(return_value=(prop, 0.0, 0.0))
        service.interaction_repo.find_interaction = AsyncMock(return_value=None)
        service.interaction_repo.create_interaction = AsyncMock(return_value=MagicMock())
        with patch("app.services.interactions_service.RedisClient.clear_user_cache", AsyncMock()):
            result = await service.add_interaction("u1", {"interaction_type": "like", "property_id": "p1"})
        assert result["status"] == "created"

    @pytest.mark.asyncio
    async def test_like_toggle_removes(self, service):
        prop = MagicMock(views_count=0, likes_count=1)
        existing = (MagicMock(id=1),)
        service.property_repo.get_by_id = AsyncMock(return_value=(prop, 0.0, 0.0))
        service.interaction_repo.find_interaction = AsyncMock(return_value=existing)
        service.interaction_repo.remove_interaction = AsyncMock(return_value=True)
        with patch("app.services.interactions_service.RedisClient.clear_user_cache", AsyncMock()):
            result = await service.add_interaction("u1", {"interaction_type": "like", "property_id": "p1"})
        assert result["status"] == "removed"

    @pytest.mark.asyncio
    async def test_existing_non_like_interaction(self, service):
        prop = MagicMock(views_count=0, likes_count=0)
        existing = (MagicMock(id=1),)
        service.property_repo.get_by_id = AsyncMock(return_value=(prop, 0.0, 0.0))
        service.interaction_repo.find_interaction = AsyncMock(return_value=existing)
        with patch("app.services.interactions_service.RedisClient.clear_user_cache", AsyncMock()):
            result = await service.add_interaction("u1", {"interaction_type": "view", "property_id": "p1"})
        assert result["status"] == "exists"


class TestGetFavorites:
    @pytest.mark.asyncio
    async def test_get_favorites(self, service):
        service.interaction_repo.get_user_favorites = AsyncMock(return_value=[MagicMock(id="p1")])
        result = await service.get_favorites("u1")
        assert len(result) == 1


class TestGetViewHistory:
    @pytest.mark.asyncio
    async def test_get_view_history(self, service):
        service.interaction_repo.get_user_view_history = AsyncMock(return_value=[MagicMock(id="p1")])
        result = await service.get_view_history("u1")
        assert len(result) == 1
