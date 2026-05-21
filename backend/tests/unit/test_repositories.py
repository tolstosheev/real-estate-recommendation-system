import pytest
from unittest.mock import AsyncMock, MagicMock


class TestUserRepositoryGetByIds:
    @pytest.mark.parametrize("user_ids, mock_users", [
        ([], {}),
        (["u1"], [MagicMock(id="u1")]),
        (["u1", "u2"], [MagicMock(id="u1"), MagicMock(id="u2")]),
        (["u1", "u3"], [MagicMock(id="u1")]),
    ])
    @pytest.mark.asyncio
    async def test_get_by_ids(self, user_ids, mock_users):
        from app.repositories.user_repository import UserRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = mock_users
        mock_session.execute = AsyncMock(return_value=mock_result)

        repo = UserRepository(mock_session)
        result = await repo.get_by_ids(user_ids)

        if not user_ids:
            assert result == {}
        else:
            for u in mock_users:
                assert str(u.id) in result


class TestPropertyRepositoryGetByIds:
    @pytest.mark.parametrize("prop_ids, count", [
        ([], 0),
        (["p1"], 1),
        (["p1", "p2", "p3"], 3),
    ])
    @pytest.mark.asyncio
    async def test_get_by_ids(self, prop_ids, count):
        from app.repositories.property_repository import PropertyRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.all.return_value = [(MagicMock(id=pid), 0.0, 0.0) for pid in prop_ids] if prop_ids else []
        mock_session.execute = AsyncMock(return_value=mock_result)

        repo = PropertyRepository(mock_session)
        result = await repo.get_by_ids(prop_ids)
        assert len(result) == count


class TestInteractionRepositoryBatchCheckLikes:
    @pytest.mark.parametrize("property_ids, liked_ids, expected_liked_count", [
        ([], None, 0),
        (["p1", "p2", "p3"], ["p1", "p3"], 2),
        (["p1", "p2"], [], 0),
    ])
    @pytest.mark.asyncio
    async def test_batch_check_likes(self, property_ids, liked_ids, expected_liked_count):
        from app.repositories.interactions_repository import InteractionRepository
        mock_session = AsyncMock()
        if property_ids and liked_ids is not None:
            mock_result = MagicMock()
            mock_result.all.return_value = [(pid,) for pid in liked_ids]
            mock_session.execute = AsyncMock(return_value=mock_result)
        else:
            mock_session.execute = AsyncMock()

        repo = InteractionRepository(mock_session)
        result = await repo.batch_check_likes("user-1", property_ids)
        assert len(result) == expected_liked_count


class TestUserPreferenceRepository:
    @pytest.mark.asyncio
    async def test_get_by_user_id_found(self):
        from app.repositories.preferences_repository import UserPreferenceRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_pref = MagicMock(user_id="u1", min_price=1000.0)
        mock_result.scalar_one_or_none.return_value = mock_pref
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = UserPreferenceRepository(mock_session)
        result = await repo.get_by_user_id("u1")
        assert result == mock_pref

    @pytest.mark.asyncio
    async def test_get_by_user_id_not_found(self):
        from app.repositories.preferences_repository import UserPreferenceRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = UserPreferenceRepository(mock_session)
        result = await repo.get_by_user_id("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_update_or_create_creates_new(self):
        from app.repositories.preferences_repository import UserPreferenceRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.add = MagicMock()
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = UserPreferenceRepository(mock_session)
        result = await repo.update_or_create("u1", {"min_price": 1000.0})
        assert mock_session.add.called
        assert mock_session.commit.called

    @pytest.mark.asyncio
    async def test_update_or_create_updates_existing(self):
        from app.repositories.preferences_repository import UserPreferenceRepository
        mock_session = AsyncMock()
        existing = MagicMock(user_id="u1")
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = UserPreferenceRepository(mock_session)
        result = await repo.update_or_create("u1", {"min_price": 2000.0})
        assert mock_session.commit.called


class TestUserRepository:
    @pytest.mark.asyncio
    async def test_create(self):
        from app.repositories.user_repository import UserRepository
        mock_session = AsyncMock()
        mock_session.add = MagicMock()
        repo = UserRepository(mock_session)
        result = await repo.create({"email": "test@test.com", "hashed_password": "pass"})
        assert mock_session.add.called
        assert mock_session.commit.called

    @pytest.mark.asyncio
    async def test_get_by_email_found(self):
        from app.repositories.user_repository import UserRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_user = MagicMock(email="test@test.com")
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = UserRepository(mock_session)
        result = await repo.get_by_email("test@test.com")
        assert result == mock_user

    @pytest.mark.asyncio
    async def test_get_by_email_not_found(self):
        from app.repositories.user_repository import UserRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = UserRepository(mock_session)
        result = await repo.get_by_email("nonexistent@test.com")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_by_id_found(self):
        from app.repositories.user_repository import UserRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_user = MagicMock(id="u1")
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = UserRepository(mock_session)
        result = await repo.get_by_id("u1")
        assert result == mock_user

    @pytest.mark.asyncio
    async def test_get_by_id_not_found(self):
        from app.repositories.user_repository import UserRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = UserRepository(mock_session)
        result = await repo.get_by_id("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_update_found(self):
        from app.repositories.user_repository import UserRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_user = MagicMock(id="u1", email="old@test.com", full_name=None)
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = UserRepository(mock_session)
        result = await repo.update("u1", {"email": "new@test.com", "full_name": "New Name"})
        assert mock_session.commit.called

    @pytest.mark.asyncio
    async def test_update_not_found(self):
        from app.repositories.user_repository import UserRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = UserRepository(mock_session)
        result = await repo.update("nonexistent", {"email": "new@test.com"})
        assert result is None


class TestInteractionRepository:
    @pytest.mark.parametrize("itype, expected_weight", [
        ("like", 5),
        ("view", 1),
        ("favorite", 1),
    ])
    @pytest.mark.asyncio
    async def test_create_interaction(self, itype, expected_weight):
        from app.repositories.interactions_repository import InteractionRepository
        mock_session = AsyncMock()
        mock_session.add = MagicMock()
        repo = InteractionRepository(mock_session)
        result = await repo.create_interaction({"interaction_type": itype, "user_id": "u1", "property_id": "p1"})
        assert mock_session.add.called
        assert mock_session.commit.called

    @pytest.mark.asyncio
    async def test_get_user_favorites(self):
        from app.repositories.interactions_repository import InteractionRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [MagicMock(id="p1")]
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = InteractionRepository(mock_session)
        result = await repo.get_user_favorites("u1")
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_user_view_history_dedup(self):
        from app.repositories.interactions_repository import InteractionRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        prop = MagicMock(id="p1")
        mock_result.all.return_value = [(prop, MagicMock()), (prop, MagicMock())]
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = InteractionRepository(mock_session)
        result = await repo.get_user_view_history("u1")
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_find_interaction_with_type(self):
        from app.repositories.interactions_repository import InteractionRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.first.return_value = (MagicMock(id=1),)
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = InteractionRepository(mock_session)
        result = await repo.find_interaction("u1", "p1", "like")
        assert result is not None

    @pytest.mark.asyncio
    async def test_find_interaction_without_type(self):
        from app.repositories.interactions_repository import InteractionRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.first.return_value = (MagicMock(id=1),)
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = InteractionRepository(mock_session)
        result = await repo.find_interaction("u1", "p1")
        assert result is not None

    @pytest.mark.asyncio
    async def test_remove_interaction_true(self):
        from app.repositories.interactions_repository import InteractionRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.rowcount = 1
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = InteractionRepository(mock_session)
        result = await repo.remove_interaction(1)
        assert result is True

    @pytest.mark.asyncio
    async def test_remove_interaction_false(self):
        from app.repositories.interactions_repository import InteractionRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.rowcount = 0
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = InteractionRepository(mock_session)
        result = await repo.remove_interaction(999)
        assert result is False


class TestPropertyRepository:
    @pytest.mark.asyncio
    async def test_create(self):
        from app.repositories.property_repository import PropertyRepository
        mock_session = AsyncMock()
        mock_session.add = MagicMock()
        repo = PropertyRepository(mock_session)
        result = await repo.create({"title": "Test", "price": 100, "lat": 55.0, "lon": 37.0})
        assert mock_session.add.called
        assert mock_session.commit.called

    @pytest.mark.asyncio
    async def test_get_all_no_filters(self):
        from app.repositories.property_repository import PropertyRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.all.return_value = [(MagicMock(id="p1"), 0.0, 0.0)]
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = PropertyRepository(mock_session)
        result = await repo.get_all()
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_all_with_filters(self):
        from app.repositories.property_repository import PropertyRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.all.return_value = [(MagicMock(id="p1"), 0.0, 0.0)]
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = PropertyRepository(mock_session)
        result = await repo.get_all(min_price=100, max_price=500, rooms=[1, 2], property_type=["Apartment"])
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_all_with_search(self):
        from app.repositories.property_repository import PropertyRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.all.return_value = [(MagicMock(id="p1"), 0.0, 0.0)]
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = PropertyRepository(mock_session)
        result = await repo.get_all(search="test")
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_by_bbox_no_filters(self):
        from app.repositories.property_repository import PropertyRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.all.return_value = [(MagicMock(id="p1"), 0.0, 0.0)]
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = PropertyRepository(mock_session)
        result = await repo.get_by_bbox(0, 90, 0, 180)
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_by_bbox_all_filters(self):
        from app.repositories.property_repository import PropertyRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.all.return_value = [(MagicMock(id="p1"), 0.0, 0.0)]
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = PropertyRepository(mock_session)
        result = await repo.get_by_bbox(0, 90, 0, 180,
            property_purpose=["sale"], district="center", metro="park",
            material=["кирпич"], repair_type=["евро"],
            min_build_year=2000, max_build_year=2020,
            min_area=30, max_area=50)
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_all_all_filters(self):
        from app.repositories.property_repository import PropertyRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.all.return_value = [(MagicMock(id="p1"), 0.0, 0.0)]
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = PropertyRepository(mock_session)
        result = await repo.get_all(
            district="center", metro="park",
            material=["кирпич"], repair_type=["евро"],
            min_build_year=2000, max_build_year=2020,
            min_area=30, max_area=50,
            lat=55.0, lon=37.0, radius_km=10)
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_by_bbox_with_filters(self):
        from app.repositories.property_repository import PropertyRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.all.return_value = [(MagicMock(id="p1"), 0.0, 0.0)]
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = PropertyRepository(mock_session)
        result = await repo.get_by_bbox(0, 90, 0, 180, min_price=100, max_price=500, rooms=[1, 2], property_type=["Apartment"], city=["Moscow"], is_new=["yes"])
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_get_by_id(self):
        from app.repositories.property_repository import PropertyRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.first.return_value = (MagicMock(id="p1"), 0.0, 0.0)
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = PropertyRepository(mock_session)
        result = await repo.get_by_id("p1")
        assert result is not None

    @pytest.mark.asyncio
    async def test_update_with_coords(self):
        from app.repositories.property_repository import PropertyRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.first.return_value = (MagicMock(id="p1"), 0.0, 0.0)
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = PropertyRepository(mock_session)
        result = await repo.update("p1", {"lat": 55.0, "lon": 37.0})
        assert mock_session.commit.called

    @pytest.mark.asyncio
    async def test_update_without_coords(self):
        from app.repositories.property_repository import PropertyRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.first.return_value = (MagicMock(id="p1"), 0.0, 0.0)
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = PropertyRepository(mock_session)
        result = await repo.update("p1", {"title": "Updated"})
        assert mock_session.commit.called

    @pytest.mark.asyncio
    async def test_delete_true(self):
        from app.repositories.property_repository import PropertyRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.rowcount = 1
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = PropertyRepository(mock_session)
        result = await repo.delete("p1")
        assert result is True

    @pytest.mark.asyncio
    async def test_delete_false(self):
        from app.repositories.property_repository import PropertyRepository
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.rowcount = 0
        mock_session.execute = AsyncMock(return_value=mock_result)
        repo = PropertyRepository(mock_session)
        result = await repo.delete("nonexistent")
        assert result is False
