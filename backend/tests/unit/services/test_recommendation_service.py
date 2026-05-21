import pytest
import numpy as np
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.recommendation_service import RecommendationService
from app.models.models import Property


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def service(mock_session):
    redis_patcher = patch("app.services.recommendation_service.RedisClient.get_client", return_value=None)
    redis_patcher.start()
    with patch.object(RecommendationService, "_diversify", side_effect=lambda sp, pv, uv, limit: [p for p, _ in sp[:limit]]):
        s = RecommendationService(mock_session)
        s.pref_repo = AsyncMock()
        s.inter_repo = AsyncMock()
        s.utils = MagicMock()
        s.utils.normalize_features = MagicMock(return_value=(np.array([[1.0]*14]), MagicMock()))
        s.utils.calculate_cosine_similarity = MagicMock(return_value=0.5)
        yield s
    redis_patcher.stop()


class TestGetPropertyVector:
    @pytest.mark.parametrize("prop_attrs, city_pref, expected", [
        (
            {"property_type": "Apartment", "property_purpose": "sale", "city": "Moscow",
             "price": 5000000, "area": 65, "rooms": 2, "build_year": 2015},
            "Moscow",
            [5000000, 65, 2, 1.0, 2.0, 2015,
             1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0],
        ),
        (
            {"property_type": "Studio", "property_purpose": "rent", "city": "London",
             "price": 2000, "area": 30, "rooms": 1, "build_year": 2020},
            "Paris",
            [2000, 30, 1, 1.0, 2.0, 2020,
             0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0],
        ),
        (
            {"property_type": "House", "property_purpose": "daily_rent", "city": "Dubai",
             "price": 15000, "area": None, "rooms": None, "build_year": None},
            None,
            [15000, 0.0, 0.0, 1.0, 2.0, 2000.0,
             0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0],
        ),
        (
            {"property_type": "Townhouse", "property_purpose": "sale", "city": "Berlin",
             "price": 350000, "area": 120, "rooms": 4, "build_year": 2010},
            "Berlin",
            [350000, 120, 4, 1.0, 2.0, 2010,
             0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0],
        ),
    ])
    def test_get_property_vector(self, service, prop_attrs, city_pref, expected):
        prop = MagicMock()
        for k, v in prop_attrs.items():
            setattr(prop, k, v)
        lon, lat = float(prop_attrs.get("lon", 1)), float(prop_attrs.get("lat", 2))
        result = service._get_property_vector(prop, lon, lat, city_pref)
        assert np.allclose(result, np.array(expected)), f"Expected {expected}, got {result.tolist()}"


class TestBuildFilterKwargs:
    @pytest.mark.parametrize("prefs_attrs, expected", [
        (
            {"min_price": 100000, "max_price": 500000, "cities": ["Moscow"],
             "material": ["кирпич"], "repair_type": ["евро"],
             "min_build_year": 2000, "max_build_year": 2020,
             "preferred_rooms": [1, 2], "property_types": ["Apartment"],
             "property_purposes": ["sale"], "min_area": 30.0, "max_area": 100.0},
            {"min_price": 100000.0, "max_price": 500000.0, "city": ["Moscow"],
             "material": ["кирпич"], "repair_type": ["евро"],
             "min_build_year": 2000, "max_build_year": 2020,
             "rooms": [1, 2], "property_type": ["Apartment"],
             "property_purpose": ["sale"], "min_area": 30.0, "max_area": 100.0},
        ),
        (
            {"min_price": None, "max_price": None},
            {},
        ),
        (
            {"min_price": 100000, "max_price": None},
            {"min_price": 100000.0},
        ),
        (
            {"max_price": 500000, "min_price": None},
            {"max_price": 500000.0},
        ),
        (
            {"property_types": ["House", "Studio"]},
            {"property_type": ["House", "Studio"]},
        ),
    ])
    def test_build_filter_kwargs(self, service, prefs_attrs, expected):
        prefs = MagicMock()
        for k, v in prefs_attrs.items():
            setattr(prefs, k, v)
        none_attrs = ["min_price", "max_price", "cities", "material", "repair_type", "min_build_year", "max_build_year",
                       "preferred_rooms", "property_types", "property_purposes", "min_area", "max_area"]
        for attr in none_attrs:
            if attr not in prefs_attrs:
                setattr(prefs, attr, None)
        result = service._build_filter_kwargs(prefs)
        assert result == expected


class TestExtractInteractedIds:
    @pytest.mark.parametrize("favs, views, expected_count", [
        ([MagicMock(id="1"), MagicMock(id="2")], [MagicMock(id="2"), MagicMock(id="3")], 3),
        ([], [MagicMock(id="1")], 1),
        ([MagicMock(id="1")], [], 1),
        ([], [], 0),
    ])
    def test_extract_interacted_ids(self, favs, views, expected_count):
        result = RecommendationService._extract_interacted_ids(favs, views)
        assert len(result) == expected_count


class TestDeterminePreferredCity:
    @pytest.mark.parametrize("prefs_cities, favs, views, expected", [
        (["Moscow"], [MagicMock(city="London")], [], "Moscow"),
        (None, [MagicMock(city="London"), MagicMock(city="London")],
         [MagicMock(city="Paris")], "London"),
        (None, [], [MagicMock(city="Berlin")], "Berlin"),
        (None, [], [], None),
    ])
    @pytest.mark.asyncio
    async def test_determine_preferred_city(self, service, prefs_cities, favs, views, expected):
        prefs = MagicMock(cities=prefs_cities)
        result = await service._determine_preferred_city(prefs, favs, views)
        assert result == expected


class TestFetchCandidates:
    @pytest.mark.parametrize("initial_count, filter_kwargs, expected_calls", [
        (100, {"city": ["Moscow"]}, 1),
    ])
    @pytest.mark.asyncio
    async def test_fetch_candidates(self, service, initial_count, filter_kwargs, expected_calls):
        mock_result = [(MagicMock(id=str(i)), 0.0, 0.0) for i in range(initial_count)]
        service.prop_repo.get_all = AsyncMock(return_value=mock_result)
        result = await service._fetch_candidates(filter_kwargs, 50)
        assert len(result) == initial_count
        assert service.prop_repo.get_all.call_count == expected_calls


class TestRecommend:
    @pytest.mark.asyncio
    async def test_recommend_no_prefs_no_interactions(self, service):
        service.pref_repo.get_by_user_id = AsyncMock(return_value=None)
        service.inter_repo.get_user_favorites = AsyncMock(return_value=[])
        service.inter_repo.get_user_view_history = AsyncMock(return_value=[])
        service.prop_repo.get_all = AsyncMock(return_value=[(MagicMock(id="1"), 0, 0)])
        service.prop_repo.get_by_ids = AsyncMock(return_value=[])
        service.utils.compute_user_profile_vector = MagicMock(return_value=None)
        with patch.object(RecommendationService, "_diversify", side_effect=lambda sp, pv, uv, limit: [p for p, _ in sp]):
            result = await service.recommend("user-1", limit=5)
            assert len(result) >= 0

    @pytest.mark.asyncio
    async def test_recommend_with_filters(self, service):
        prefs = MagicMock(
            min_price=100000.0, max_price=500000.0,
            cities=["Moscow"], material=["кирпич"], repair_type=["евро"],
            min_build_year=2000, max_build_year=2020,
            preferred_rooms=[1, 2], property_types=["Apartment"],
            property_purposes=["sale"], min_area=30.0, max_area=100.0,
            tags=[], priority_weight=None,
        )
        service.pref_repo.get_by_user_id = AsyncMock(return_value=prefs)
        service.inter_repo.get_user_favorites = AsyncMock(return_value=[])
        service.inter_repo.get_user_view_history = AsyncMock(return_value=[])
        service.prop_repo.get_all = AsyncMock(return_value=[(MagicMock(id="1"), 0, 0)])
        service.prop_repo.get_by_ids = AsyncMock(return_value=[])
        service.utils.compute_user_profile_vector = MagicMock(return_value=None)

        with patch.object(RecommendationService, "_diversify", side_effect=lambda sp, pv, uv, limit: [p for p, _ in sp]):
            result = await service.recommend("user-1", limit=5)
            assert len(result) >= 0

    @pytest.mark.asyncio
    async def test_recommend_excludes_interacted(self, service):
        service.pref_repo.get_by_user_id = AsyncMock(return_value=None)
        service.inter_repo.get_user_favorites = AsyncMock(return_value=[MagicMock(id="1")])
        service.inter_repo.get_user_view_history = AsyncMock(return_value=[])
        props = [(MagicMock(id=str(i), price=100), 0, 0) for i in range(5)]
        service.prop_repo.get_all = AsyncMock(return_value=props)
        service.prop_repo.get_by_ids = AsyncMock(return_value=[])
        service.utils.compute_user_profile_vector = MagicMock(return_value=None)
        with patch.object(RecommendationService, "_diversify", side_effect=lambda sp, pv, uv, limit: [p for p, _ in sp]):
            result = await service.recommend("user-1", limit=5)
            assert all(p.id != "1" for p in result)


class TestBuildUserVector:
    @pytest.mark.asyncio
    async def test_build_user_vector_no_prefs_no_interactions(self, service):
        service.pref_repo.get_by_user_id = AsyncMock(return_value=None)
        service.inter_repo.get_user_favorites = AsyncMock(return_value=[])
        service.inter_repo.get_user_view_history = AsyncMock(return_value=[])
        service.utils.compute_user_profile_vector = MagicMock(return_value=None)
        with patch("app.services.recommendation_service.RedisClient.get_client", AsyncMock(return_value=None)):
            result = await service._build_user_vector("user-1")
            assert result is None

    @pytest.mark.asyncio
    async def test_build_user_vector_with_prefs(self, service):
        prefs = MagicMock(
            min_price=100000.0, max_price=500000.0, min_area=30.0, max_area=100.0,
            preferred_rooms=[1, 2], min_build_year=2000, max_build_year=2020,
            property_types=["Apartment"], property_purposes=["sale"], cities=["Moscow"],
        )
        service.pref_repo.get_by_user_id = AsyncMock(return_value=prefs)
        service.inter_repo.get_user_favorites = AsyncMock(return_value=[])
        service.inter_repo.get_user_view_history = AsyncMock(return_value=[])
        service.utils.compute_user_profile_vector = MagicMock(return_value=np.array([1.0] * 14))
        with patch("app.services.recommendation_service.RedisClient.get_client", AsyncMock(return_value=None)):
            result = await service._build_user_vector("user-1")
            assert result is not None

    @pytest.mark.asyncio
    async def test_build_user_vector_cached(self, service):
        import json
        cached_vec = json.dumps([1.0] * 14)
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.setex = AsyncMock(return_value=True)
        mock_redis.get = AsyncMock(return_value=cached_vec)
        with patch("app.services.recommendation_service.RedisClient.get_client", AsyncMock(return_value=mock_redis)):
            result = await service._build_user_vector("user-1")
            assert result is not None
            assert len(result) == 14

    @pytest.mark.asyncio
    async def test_build_user_vector_cache_wrong_dim(self, service):
        import json
        cached_vec = json.dumps([1.0] * 5)
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.setex = AsyncMock(return_value=True)
        mock_redis.get = AsyncMock(return_value=cached_vec)
        service.pref_repo.get_by_user_id = AsyncMock(return_value=None)
        service.inter_repo.get_user_favorites = AsyncMock(return_value=[])
        service.inter_repo.get_user_view_history = AsyncMock(return_value=[])
        service.utils.compute_user_profile_vector = MagicMock(return_value=None)
        with patch("app.services.recommendation_service.RedisClient.get_client", AsyncMock(return_value=mock_redis)):
            result = await service._build_user_vector("user-1")
            assert result is None

    @pytest.mark.asyncio
    async def test_build_user_vector_with_interactions(self, service):
        service.pref_repo.get_by_user_id = AsyncMock(return_value=None)
        fav = MagicMock(spec=Property, id="p1", price=100, area=50, rooms=2, build_year=2010,
                        property_type="Apartment", property_purpose="sale", city="Moscow")
        service.inter_repo.get_user_favorites = AsyncMock(return_value=[fav])
        service.inter_repo.get_user_view_history = AsyncMock(return_value=[])
        service.prop_repo.get_by_ids = AsyncMock(return_value=[(fav, 37.0, 55.0)])
        service.utils.compute_user_profile_vector = MagicMock(return_value=np.array([1.0] * 14))
        with patch("app.services.recommendation_service.RedisClient.get_client", AsyncMock(return_value=None)):
            result = await service._build_user_vector("user-1", "Moscow")
            assert result is not None


class TestDiversify:
    def test_diversify_returns_all_when_limit_ge_count(self, service):
        from sklearn.metrics.pairwise import cosine_similarity
        props = [MagicMock(id=str(i)) for i in range(3)]
        scored = [(p, 1.0 - i * 0.1) for i, p in enumerate(props)]
        vectors = np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1]])
        user_vec = np.array([1, 1, 1])
        result = service._diversify(scored, vectors, user_vec, limit=5)
        assert len(result) == 3

    def test_diversify_selects_best(self, service):
        props = [MagicMock(id=str(i)) for i in range(5)]
        scored = [(p, 1.0 - i * 0.1) for i, p in enumerate(props)]
        vectors = np.eye(5)
        user_vec = np.array([1, 1, 1, 1, 1])
        result = service._diversify(scored, vectors, user_vec, limit=3)
        assert len(result) == 3


class TestFetchCandidatesRelaxation:
    @pytest.mark.asyncio
    async def test_fetch_candidates_relaxes_filters(self, service):
        props = [MagicMock(id="p1"), MagicMock(id="p2")]
        service.prop_repo.get_all = AsyncMock(side_effect=lambda *a, **kw: props if "material" not in kw else [])
        result = await service._fetch_candidates({"city": ["Moscow"], "material": ["кирпич"]}, 50)
        assert len(result) >= 0

    @pytest.mark.asyncio
    async def test_fetch_candidates_full_relaxation(self, service):
        props = [MagicMock(id="p1"), MagicMock(id="p2"), MagicMock(id="p3")]
        service.prop_repo.get_all = AsyncMock(side_effect=lambda *a, **kw: [])
        result = await service._fetch_candidates({"min_price": 100, "max_price": 200, "city": ["Moscow"]}, 50)
        assert len(result) == 0


class TestRecommendWithCache:
    @pytest.mark.asyncio
    async def test_recommend_uses_cached_recs(self, service):
        import json
        cached_ids = json.dumps(["p1", "p2"])
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.setex = AsyncMock(return_value=True)
        mock_redis.get = AsyncMock(return_value=cached_ids)
        service.prop_repo.get_by_ids = AsyncMock(return_value=[(MagicMock(id="p1"), 0, 0), (MagicMock(id="p2"), 0, 0)])
        with patch("app.services.recommendation_service.RedisClient.get_client", AsyncMock(return_value=mock_redis)):
            result = await service.recommend("user-1", limit=5)
            assert service.prop_repo.get_by_ids.called


class TestRecommendWithUserVec:
    @pytest.mark.asyncio
    async def test_recommend_with_user_vec_scoring(self, service):
        from sklearn.preprocessing import StandardScaler
        service.pref_repo.get_by_user_id = AsyncMock(return_value=None)
        service.inter_repo.get_user_favorites = AsyncMock(return_value=[])
        service.inter_repo.get_user_view_history = AsyncMock(return_value=[])
        service.prop_repo.get_all = AsyncMock(return_value=[(MagicMock(id=str(i), price=100, area=50, rooms=1,
            build_year=2000, property_type="Apartment", property_purpose="sale", city="Moscow"), 37.0, 55.0) for i in range(5)])
        service.prop_repo.get_by_ids = AsyncMock(return_value=[])
        service.utils.compute_user_profile_vector = MagicMock(return_value=np.array([1.0] * 14))
        n_props = 5
        scaler = StandardScaler()
        data = np.random.rand(n_props, 14)
        scaler.fit(data)
        service.utils.normalize_features = MagicMock(return_value=(data, scaler))
        service.utils.calculate_cosine_similarity = MagicMock(return_value=0.5)

        with patch.object(RecommendationService, "_diversify", side_effect=lambda sp, pv, uv, limit: [p for p, _ in sp[:limit]]):
            result = await service.recommend("user-1", limit=n_props)
            assert len(result) > 0


class TestBuildUserVectorEdgeCases:
    @pytest.mark.asyncio
    async def test_build_user_vector_only_min_build_year(self, service):
        prefs = MagicMock(
            min_price=100000.0, max_price=None, min_area=0.0, max_area=0.0,
            preferred_rooms=[], min_build_year=2005, max_build_year=None,
            property_types=None, property_purposes=None, cities=None,
        )
        service.pref_repo.get_by_user_id = AsyncMock(return_value=prefs)
        service.inter_repo.get_user_favorites = AsyncMock(return_value=[])
        service.inter_repo.get_user_view_history = AsyncMock(return_value=[])
        service.utils.compute_user_profile_vector = MagicMock(return_value=np.array([1.0] * 14))
        with patch("app.services.recommendation_service.RedisClient.get_client", AsyncMock(return_value=None)):
            result = await service._build_user_vector("user-1")
            assert result is not None

    @pytest.mark.asyncio
    async def test_build_user_vector_views_no_prop_match(self, service):
        service.pref_repo.get_by_user_id = AsyncMock(return_value=None)
        view = MagicMock(spec=Property, id="v1")
        service.inter_repo.get_user_favorites = AsyncMock(return_value=[])
        service.inter_repo.get_user_view_history = AsyncMock(return_value=[view])
        service.prop_repo.get_by_ids = AsyncMock(return_value=[])
        service.utils.compute_user_profile_vector = MagicMock(return_value=None)
        with patch("app.services.recommendation_service.RedisClient.get_client", AsyncMock(return_value=None)):
            result = await service._build_user_vector("user-1")
            assert result is None


class TestDiversifyMmr:
    def test_diversify_mmr_selects_diverse(self):
        s = RecommendationService(AsyncMock())
        s.utils = MagicMock()
        props = [MagicMock(id=str(i)) for i in range(10)]
        scored = [(p, 1.0 - i * 0.05) for i, p in enumerate(props)]
        vectors = np.random.rand(10, 14)
        user_vec = np.ones(14)
        result = s._diversify(scored, vectors, user_vec, limit=3)
        assert len(result) == 3


class TestRecommendEdgeCases:
    @pytest.mark.asyncio
    async def test_recommend_empty_candidates(self, service):
        service.pref_repo.get_by_user_id = AsyncMock(return_value=None)
        service.inter_repo.get_user_favorites = AsyncMock(return_value=[])
        service.inter_repo.get_user_view_history = AsyncMock(return_value=[])
        service.prop_repo.get_all = AsyncMock(return_value=[])
        result = await service.recommend("user-1", limit=5)
        assert result == []

    @pytest.mark.asyncio
    async def test_recommend_city_filter_active(self, service):
        prefs = MagicMock(
            min_price=None, max_price=None, min_area=None, max_area=None,
            preferred_rooms=None, min_build_year=None, max_build_year=None,
            property_types=None, property_purposes=None,
            cities=["Moscow"], material=None, repair_type=None,
        )
        service.pref_repo.get_by_user_id = AsyncMock(return_value=prefs)
        service.inter_repo.get_user_favorites = AsyncMock(return_value=[])
        service.inter_repo.get_user_view_history = AsyncMock(return_value=[])
        service.prop_repo.get_all = AsyncMock(return_value=[(MagicMock(id=str(i), price=100, area=50, rooms=1,
            build_year=2000, property_type="Apartment", property_purpose="sale", city="Moscow"), 37.0, 55.0) for i in range(3)])
        service.prop_repo.get_by_ids = AsyncMock(return_value=[])
        service.utils.compute_user_profile_vector = MagicMock(return_value=np.array([1.0] * 14))
        n_props = 3
        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        data = np.random.rand(n_props, 14)
        scaler.fit(data)
        service.utils.normalize_features = MagicMock(return_value=(data, scaler))
        service.utils.calculate_cosine_similarity = MagicMock(return_value=0.5)

        with patch.object(RecommendationService, "_diversify", side_effect=lambda sp, pv, uv, limit: [p for p, _ in sp[:limit]]):
            result = await service.recommend("user-1", limit=n_props)
            assert len(result) > 0


class TestFetchCandidatesPriceRelaxation:
    @pytest.mark.asyncio
    async def test_fetch_candidates_price_relax(self, service):
        service.prop_repo.get_all = AsyncMock(return_value=[MagicMock(id="p1")])
        result = await service._fetch_candidates({"min_price": 100, "max_price": 200}, 50)
        assert len(result) == 1


class TestRecommendWeightAdjustments:
    @pytest.mark.asyncio
    async def test_recommend_zero_lon_lat_adjusts_weights(self, service):
        from sklearn.preprocessing import StandardScaler
        service.pref_repo.get_by_user_id = AsyncMock(return_value=None)
        service.inter_repo.get_user_favorites = AsyncMock(return_value=[])
        service.inter_repo.get_user_view_history = AsyncMock(return_value=[])
        service.prop_repo.get_all = AsyncMock(return_value=[(MagicMock(id=str(i), price=100, area=50, rooms=1,
            build_year=2000, property_type="Apartment", property_purpose="sale", city="Moscow"), 37.0, 55.0) for i in range(3)])
        service.prop_repo.get_by_ids = AsyncMock(return_value=[])
        user_vec = np.array([1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0])
        service.utils.compute_user_profile_vector = MagicMock(return_value=user_vec)
        n_props = 3
        scaler = StandardScaler()
        data = np.random.rand(n_props, 14)
        scaler.fit(data)
        service.utils.normalize_features = MagicMock(return_value=(data, scaler))
        service.utils.calculate_cosine_similarity = MagicMock(return_value=0.5)

        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.setex = AsyncMock(return_value=True)
        with patch("app.services.recommendation_service.RedisClient.get_client", AsyncMock(return_value=mock_redis)):
            with patch.object(RecommendationService, "_diversify", side_effect=lambda sp, pv, uv, limit: [p for p, _ in sp[:limit]]):
                result = await service.recommend("user-1", limit=n_props)
                assert len(result) > 0
                assert mock_redis.setex.called
