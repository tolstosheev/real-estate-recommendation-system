import asyncio
import json

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity  # type: ignore[import-untyped]
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import RedisClient
from app.core.similarity import SimilarityUtils
from app.models import Property
from app.repositories.interactions_repository import InteractionRepository
from app.repositories.preferences_repository import UserPreferenceRepository
from app.repositories.property_repository import PropertyRepository
from app.services.property_service import PropertyService


class RecommendationService:
    VECTOR_DIM = 14
    CACHE_TTL_USER_VEC = 3600
    CACHE_TTL_RECS = 3600
    MMR_LAMBDA = 0.7
    DEFAULT_BUILD_YEAR = 2000
    DEFAULT_ROOMS = 2.0
    DEFAULT_AREA_MAX = 200
    DEFAULT_AREA_MID = 100.0
    FAVORITE_WEIGHT = 1.0
    VIEW_WEIGHT = 0.2
    COLLAB_SIMILAR_USERS_LIMIT = 10
    COLLAB_MIN_LIKES = 3
    COLLAB_CONTENT_WEIGHT = 0.7
    COLLAB_WEIGHT = 0.3

    FEATURE_WEIGHTS = np.array([
        2.0,   # 0: price
        1.5,   # 1: area
        1.5,   # 2: rooms
        0.5,   # 3: lon
        0.5,   # 4: lat
        0.5,   # 5: build_year
        0.5,   # 6: apartment
        0.5,   # 7: studio
        0.5,   # 8: house
        0.5,   # 9: townhouse
        1.5,   # 10: sale
        1.5,   # 11: rent
        0.5,   # 12: daily_rent
        2.0,   # 13: city_match
    ])

    def __init__(self, session: AsyncSession, prop_service: PropertyService | None = None):
        self.prop_repo = PropertyRepository(session)
        self.pref_repo = UserPreferenceRepository(session)
        self.inter_repo = InteractionRepository(session)
        self.prop_service = prop_service or PropertyService(session)
        self.utils = SimilarityUtils()

    def _get_property_vector(
        self, prop: Property, lon: float = 0.0, lat: float = 0.0, preferred_city: str | None = None
    ) -> np.ndarray:
        ptype = (prop.property_type or '').lower()
        purpose = (prop.property_purpose or '').lower()
        prop_city = (prop.city or '').lower()
        pref_city = (preferred_city or '').lower()

        return np.array([
            float(prop.price),
            float(prop.area) if prop.area else 0.0,
            float(prop.rooms) if prop.rooms else 0.0,
            float(lon),
            float(lat),
            float(prop.build_year) if prop.build_year else self.DEFAULT_BUILD_YEAR,
            1.0 if ptype == 'apartment' else 0.0,
            1.0 if ptype == 'studio' else 0.0,
            1.0 if ptype == 'house' else 0.0,
            1.0 if ptype == 'townhouse' else 0.0,
            1.0 if purpose == 'sale' else 0.0,
            1.0 if purpose == 'rent' else 0.0,
            1.0 if purpose == 'daily_rent' else 0.0,
            1.0 if pref_city and prop_city == pref_city else 0.0,
        ])

    async def _build_user_vector(
        self, user_id: str, preferred_city: str | None = None
    ) -> np.ndarray | None:
        redis = await RedisClient.get_client()
        if redis:
            cache_key = f"user_vec:{user_id}"
            cached_vec = await redis.get(cache_key)
            if cached_vec:
                vec = np.array(json.loads(cached_vec))
                if vec.shape[0] == self.VECTOR_DIM:
                    return vec

        prefs = await self.pref_repo.get_by_user_id(user_id)

        explicit_vec = None
        if prefs:
            price = (
                (float(prefs.min_price or 0) + float(prefs.max_price or 0)) / 2
                if (prefs.min_price and prefs.max_price)
                else float(prefs.min_price or prefs.max_price or 0)
            )
            a_min = float(prefs.min_area or 0)
            a_max = float(prefs.max_area or self.DEFAULT_AREA_MAX)
            area = (a_min + a_max) / 2 if a_min > 0 or a_max < self.DEFAULT_AREA_MAX else self.DEFAULT_AREA_MID
            rooms = sum(prefs.preferred_rooms) / len(prefs.preferred_rooms) if prefs.preferred_rooms else self.DEFAULT_ROOMS
            if prefs.min_build_year and prefs.max_build_year:
                build_year = (prefs.min_build_year + prefs.max_build_year) / 2
            else:
                build_year = prefs.min_build_year or prefs.max_build_year or self.DEFAULT_BUILD_YEAR  # type: ignore[assignment]

            sel_types = [t.lower() for t in (prefs.property_types or [])]  # type: ignore[union-attr]
            sel_purps = [p.lower() for p in (prefs.property_purposes or [])]  # type: ignore[union-attr]

            explicit_vec = [
                price, area, rooms, 0.0, 0.0, build_year,
                1.0 if 'apartment' in sel_types else 0.0,
                1.0 if 'studio' in sel_types else 0.0,
                1.0 if 'house' in sel_types else 0.0,
                1.0 if 'townhouse' in sel_types else 0.0,
                1.0 if 'sale' in sel_purps else 0.0,
                1.0 if 'rent' in sel_purps else 0.0,
                1.0 if 'daily_rent' in sel_purps else 0.0,
                1.0 if prefs.cities else 0.0,
            ]

        favorites = await self.inter_repo.get_user_favorites(user_id)
        views = await self.inter_repo.get_user_view_history(user_id)

        implicit_vec = None
        if favorites or views:
            weighted_vectors = []

            if favorites:
                for row in favorites:
                    prop = row[0]
                    lon = float(row[1]) if len(row) > 1 and row[1] else 0.0
                    lat = float(row[2]) if len(row) > 2 and row[2] else 0.0
                    vec = self._get_property_vector(prop, lon, lat, preferred_city)
                    weighted_vectors.append(vec * self.FAVORITE_WEIGHT)

            if views:
                for row in views:
                    prop = row[0]
                    lon = float(row[2]) if len(row) > 2 and row[2] else 0.0
                    lat = float(row[3]) if len(row) > 3 and row[3] else 0.0
                    vec = self._get_property_vector(prop, lon, lat, preferred_city)
                    weighted_vectors.append(vec * self.VIEW_WEIGHT)

            if weighted_vectors:
                implicit_vec = np.mean(weighted_vectors, axis=0).tolist()

        user_vec = self.utils.compute_user_profile_vector(explicit_vec, implicit_vec)  # type: ignore[arg-type]
        if user_vec is not None and redis:
            await redis.setex(f"user_vec:{user_id}", self.CACHE_TTL_USER_VEC, json.dumps(user_vec.tolist()))

        return user_vec

    async def recommend(self, user_id: str, limit: int = 10) -> list[Property]:
        redis = await RedisClient.get_client()
        if redis:
            cache_key = f"user_recs:{user_id}:{limit}"
            cached_recs = await redis.get(cache_key)
            if cached_recs:
                prop_ids = json.loads(cached_recs)
                rows = await self.prop_repo.get_by_ids(prop_ids)
                enriched = []
                for row in rows:
                    prop = row[0]
                    prop.lat = float(row[2]) if len(row) > 2 and row[2] else 0.0
                    prop.lon = float(row[1]) if len(row) > 1 and row[1] else 0.0
                    enriched.append(prop)
                return enriched

        prefs = await self.pref_repo.get_by_user_id(user_id)

        filter_kwargs = self._build_filter_kwargs(prefs)

        favs = await self.inter_repo.get_user_favorites(user_id)
        views = await self.inter_repo.get_user_view_history(user_id)

        preferred_city = await self._determine_preferred_city(prefs, favs, views)

        if preferred_city and 'city' not in filter_kwargs:
            filter_kwargs['city'] = [preferred_city]

        city_filter_active = 'city' in filter_kwargs

        interacted_ids = self._extract_interacted_ids(favs, views)

        user_vec = await self._build_user_vector(user_id, preferred_city)

        all_rows = await self._fetch_candidates(filter_kwargs, limit)
        if all_rows:
            all_rows = [row for row in all_rows if str(row[0].id) not in interacted_ids]

        if not all_rows:
            return []

        if user_vec is None:
            return [row[0] for row in all_rows[:limit]]

        properties = [row[0] for row in all_rows]
        prop_vectors = np.array([
            self._get_property_vector(row[0], row[1], row[2], preferred_city) for row in all_rows
        ])

        weights = self.FEATURE_WEIGHTS.copy()
        if user_vec[3] == 0.0 and user_vec[4] == 0.0:
            weights[3] = 0.0
            weights[4] = 0.0
        if city_filter_active:
            weights[13] = 0.0

        if 'property_purpose' in filter_kwargs:
            weights[10] = 0.0  # sale
            weights[11] = 0.0  # rent
            weights[12] = 0.0  # daily_rent

        norm_prop_vectors, scaler = await asyncio.to_thread(
            self.utils.normalize_features, prop_vectors
        )
        norm_user_vec = await asyncio.to_thread(
            lambda: scaler.transform(user_vec.reshape(1, -1))[0]
        )

        norm_prop_vectors = np.nan_to_num(norm_prop_vectors, nan=0.0)
        norm_user_vec = np.nan_to_num(norm_user_vec, nan=0.0)

        norm_prop_vectors *= weights
        norm_user_vec *= weights

        scores = await asyncio.to_thread(
            lambda: cosine_similarity(norm_prop_vectors, norm_user_vec.reshape(1, -1)).flatten()
        )
        scored_props = list(zip(properties, scores, strict=False))

        similar_users = await self._find_similar_users(user_id)
        if similar_users:
            candidate_ids = [str(p.id) for p in properties]
            collab_scores = await self._score_collaborative(candidate_ids, similar_users)
            if collab_scores:
                scored_props = [
                    (
                        p,
                        self.COLLAB_CONTENT_WEIGHT * s
                        + self.COLLAB_WEIGHT * collab_scores.get(str(p.id), 0.0),
                    )
                    for p, s in scored_props
                ]

        scored_props.sort(key=lambda x: x[1], reverse=True)

        top_props = await self._diversify(scored_props, norm_prop_vectors, norm_user_vec, limit)

        prop_loc = {}
        for row in all_rows:
            prop_loc[str(row[0].id)] = (
                float(row[1]) if len(row) > 1 and row[1] else 0.0,
                float(row[2]) if len(row) > 2 and row[2] else 0.0,
            )
        for p in top_props:
            loc = prop_loc.get(str(p.id))
            if loc:
                p.lon, p.lat = loc

        if top_props and redis:
            prop_ids = [str(p.id) for p in top_props]
            await redis.setex(f"user_recs:{user_id}:{limit}", self.CACHE_TTL_RECS, json.dumps(prop_ids))

        if top_props:
            return await self.prop_service.batch_enrich_recs(top_props, user_id)

        return top_props

    def _build_filter_kwargs(self, prefs) -> dict:
        filter_kwargs: dict[str, object] = {}
        if not prefs:
            return filter_kwargs

        if prefs.min_price is not None:
            filter_kwargs['min_price'] = float(prefs.min_price)
        if prefs.max_price is not None:
            filter_kwargs['max_price'] = float(prefs.max_price)
        if prefs.cities:
            filter_kwargs['city'] = [c.lower() for c in prefs.cities]
        if prefs.material:
            filter_kwargs['material'] = [m.lower() for m in prefs.material]
        if prefs.repair_type:
            filter_kwargs['repair_type'] = [r.lower() for r in prefs.repair_type]
        if prefs.min_build_year:
            filter_kwargs['min_build_year'] = prefs.min_build_year
        if prefs.max_build_year:
            filter_kwargs['max_build_year'] = prefs.max_build_year
        if prefs.preferred_rooms:
            filter_kwargs['rooms'] = prefs.preferred_rooms
        if prefs.property_types:
            filter_kwargs['property_type'] = [t.lower() for t in prefs.property_types]
        if prefs.property_purposes:
            filter_kwargs['property_purpose'] = [p.lower() for p in prefs.property_purposes]
        if prefs.min_area is not None:
            filter_kwargs['min_area'] = float(prefs.min_area)
        if prefs.max_area is not None:
            filter_kwargs['max_area'] = float(prefs.max_area)

        return filter_kwargs

    async def _determine_preferred_city(
        self, prefs, favs, views
    ) -> str | None:
        if prefs and prefs.cities:
            return prefs.cities[0]

        city_counts: dict[str, int] = {}
        for row in (favs or []) + (views or []):
            p = row[0]
            if p.city:
                city_counts[p.city] = city_counts.get(p.city, 0) + 1

        if city_counts:
            return max(city_counts, key=lambda k: city_counts[k])

        return None

    @staticmethod
    def _extract_interacted_ids(favs, views) -> set[str]:
        interacted_ids = set()
        for row in (favs or []) + (views or []):
            interacted_ids.add(str(row[0].id))
        return interacted_ids

    async def _fetch_candidates(self, filter_kwargs: dict, limit: int):
        strict_keys = {'city', 'property_purpose', 'min_price', 'max_price'}
        strict = {k: v for k, v in filter_kwargs.items() if k in strict_keys}
        relaxable = {k: v for k, v in filter_kwargs.items() if k not in strict_keys}

        def merge_strict(**extra) -> dict:
            return {**strict, **extra}

        all_rows = await self.prop_repo.get_all(limit=1000, **merge_strict(**relaxable))

        if not all_rows or len(all_rows) < limit:
            relaxed = {k: v for k, v in relaxable.items() if k not in ('material', 'repair_type')}
            rows = await self.prop_repo.get_all(limit=1000, **merge_strict(**relaxed))
            if len(rows) > len(all_rows):
                all_rows = rows

            if not all_rows or len(all_rows) < limit:
                for key in ('rooms', 'min_area', 'max_area', 'min_build_year', 'max_build_year'):
                    relaxed.pop(key, None)
                rows = await self.prop_repo.get_all(limit=1000, **merge_strict(**relaxed))
                if len(rows) > len(all_rows):
                    all_rows = rows

                if not all_rows or len(all_rows) < limit:
                    for key in ('property_type',):
                        relaxed.pop(key, None)
                    rows = await self.prop_repo.get_all(limit=1000, **merge_strict(**relaxed))
                    if len(rows) > len(all_rows):
                        all_rows = rows

        if not all_rows and 'city' in strict:
            city = strict.pop('city')
            all_rows = await self.prop_repo.get_all(limit=1000, **merge_strict(**relaxable))

        return all_rows

    async def _find_similar_users(self, user_id: str) -> list[str]:
        my_favs = await self.inter_repo.get_user_favorites(user_id)
        my_prop_ids = {str(row[0].id) for row in my_favs}

        if len(my_prop_ids) < self.COLLAB_MIN_LIKES:
            return []

        all_users = await self.inter_repo.get_users_liked_properties()
        current_user_id = str(user_id)

        user_scores: list[tuple[str, float]] = []
        for uid, liked_set in all_users.items():
            if uid == current_user_id:
                continue
            intersection = my_prop_ids & liked_set
            if not intersection:
                continue
            union = my_prop_ids | liked_set
            jaccard = len(intersection) / len(union)
            if jaccard > 0:
                user_scores.append((uid, jaccard))

        user_scores.sort(key=lambda x: x[1], reverse=True)
        return [uid for uid, _ in user_scores[:self.COLLAB_SIMILAR_USERS_LIMIT]]

    async def _score_collaborative(
        self, candidate_ids: list[str], similar_users: list[str]
    ) -> dict[str, float]:
        if not similar_users or not candidate_ids:
            return {}

        all_users = await self.inter_repo.get_users_liked_properties()
        candidate_set = set(candidate_ids)

        prop_scores: dict[str, float] = {}
        for uid in similar_users:
            liked = all_users.get(uid, set()) & candidate_set
            for pid in liked:
                prop_scores[pid] = prop_scores.get(pid, 0.0) + 1.0

        if not prop_scores:
            return {}

        max_score = max(prop_scores.values())
        return {pid: s / max_score for pid, s in prop_scores.items()}

    async def _diversify(self, scored_props, prop_vectors, user_vec, limit, lambda_param=None):
        if lambda_param is None:
            lambda_param = self.MMR_LAMBDA
        if not scored_props or limit >= len(scored_props):
            return [p for p, _ in scored_props]

        n = len(scored_props)
        properties = [p for p, _ in scored_props]
        scores = np.array([s for _, s in scored_props])
        pairwise_sim = await asyncio.to_thread(cosine_similarity, prop_vectors)

        selected = []
        remaining = list(range(n))

        first_idx = remaining.pop(0)
        selected.append(first_idx)

        while len(selected) < limit and remaining:
            best_idx = None
            best_mmr = -np.inf

            for i in remaining:
                mmr_score = lambda_param * scores[i]
                mmr_diversity = (1 - lambda_param) * max(pairwise_sim[i][j] for j in selected)
                mmr = mmr_score - mmr_diversity

                if mmr > best_mmr:
                    best_mmr = mmr
                    best_idx = i

            if best_idx is not None:
                remaining.remove(best_idx)
                selected.append(best_idx)
            else:
                break

        return [properties[i] for i in selected]
