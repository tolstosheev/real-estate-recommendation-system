from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.property_repository import PropertyRepository
from app.repositories.preferences_repository import UserPreferenceRepository
from app.repositories.interactions_repository import InteractionRepository
from app.core.similarity import SimilarityUtils
from app.core.redis import RedisClient
import numpy as np
import json
from typing import List, Optional, Set
from app.models.models import Property


class RecommendationService:
    VECTOR_DIM = 14

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

    def __init__(self, session: AsyncSession):
        self.prop_repo = PropertyRepository(session)
        self.pref_repo = UserPreferenceRepository(session)
        self.inter_repo = InteractionRepository(session)
        self.utils = SimilarityUtils()

    def _get_property_vector(
        self, prop: Property, lon: float = 0.0, lat: float = 0.0, preferred_city: Optional[str] = None
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
            float(prop.build_year) if prop.build_year else 2000.0,
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
        self, user_id: str, preferred_city: Optional[str] = None
    ) -> Optional[np.ndarray]:
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
            a_max = float(prefs.max_area or 200)
            area = (a_min + a_max) / 2 if a_min > 0 or a_max < 200 else 100.0
            rooms = sum(prefs.preferred_rooms) / len(prefs.preferred_rooms) if prefs.preferred_rooms else 2.0
            if prefs.min_build_year and prefs.max_build_year:
                build_year = (prefs.min_build_year + prefs.max_build_year) / 2
            else:
                build_year = prefs.min_build_year or prefs.max_build_year or 2000

            sel_types = [t.lower() for t in (prefs.property_types or [])]
            sel_purps = [p.lower() for p in (prefs.property_purposes or [])]

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
                for p in favorites:
                    res = await self.prop_repo.get_by_id(p.id)
                    if res:
                        vec = self._get_property_vector(res[0], res[1], res[2], preferred_city)
                        weighted_vectors.append(vec * 1.0)

            if views:
                for p in views:
                    res = await self.prop_repo.get_by_id(p.id)
                    if res:
                        vec = self._get_property_vector(res[0], res[1], res[2], preferred_city)
                        weighted_vectors.append(vec * 0.2)

            if weighted_vectors:
                implicit_vec = np.mean(weighted_vectors, axis=0).tolist()

        user_vec = self.utils.compute_user_profile_vector(explicit_vec, implicit_vec)
        if user_vec is not None and redis:
            await redis.setex(f"user_vec:{user_id}", 3600, json.dumps(user_vec.tolist()))

        return user_vec

    async def recommend(self, user_id: str, limit: int = 10) -> List[Property]:
        redis = await RedisClient.get_client()
        if redis:
            cache_key = f"user_recs:{user_id}:{limit}"
            cached_recs = await redis.get(cache_key)
            if cached_recs:
                prop_ids = json.loads(cached_recs)
                props = await self.prop_repo.get_by_ids(prop_ids)
                return props

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

        norm_prop_vectors, scaler = self.utils.normalize_features(prop_vectors.tolist())
        norm_user_vec = scaler.transform(user_vec.reshape(1, -1))[0]

        norm_prop_vectors = np.nan_to_num(norm_prop_vectors, nan=0.0)
        norm_user_vec = np.nan_to_num(norm_user_vec, nan=0.0)

        norm_prop_vectors *= weights
        norm_user_vec *= weights

        scored_props = []
        for i, prop in enumerate(properties):
            p_vec = norm_prop_vectors[i]
            score = self.utils.calculate_cosine_similarity(norm_user_vec, p_vec)
            scored_props.append((prop, score))

        scored_props.sort(key=lambda x: x[1], reverse=True)

        top_props = self._diversify(scored_props, norm_prop_vectors, norm_user_vec, limit)

        if top_props and redis:
            prop_ids = [str(p.id) for p in top_props]
            await redis.setex(f"user_recs:{user_id}:{limit}", 3600, json.dumps(prop_ids))

        return top_props

    def _build_filter_kwargs(self, prefs) -> dict:
        filter_kwargs = {}
        if not prefs:
            return filter_kwargs

        if prefs.min_price is not None:
            filter_kwargs['min_price'] = float(prefs.min_price)
        if prefs.max_price is not None:
            filter_kwargs['max_price'] = float(prefs.max_price)
        if prefs.cities:
            filter_kwargs['city'] = prefs.cities
        if prefs.material:
            filter_kwargs['material'] = prefs.material
        if prefs.repair_type:
            filter_kwargs['repair_type'] = prefs.repair_type
        if prefs.min_build_year:
            filter_kwargs['min_build_year'] = prefs.min_build_year
        if prefs.max_build_year:
            filter_kwargs['max_build_year'] = prefs.max_build_year
        if prefs.preferred_rooms:
            filter_kwargs['rooms'] = prefs.preferred_rooms
        if prefs.property_types:
            filter_kwargs['property_type'] = prefs.property_types
        if prefs.property_purposes:
            filter_kwargs['property_purpose'] = prefs.property_purposes
        if prefs.min_area is not None:
            filter_kwargs['min_area'] = float(prefs.min_area)
        if prefs.max_area is not None:
            filter_kwargs['max_area'] = float(prefs.max_area)

        return filter_kwargs

    async def _determine_preferred_city(
        self, prefs, favs: List[Property], views: List[Property]
    ) -> Optional[str]:
        if prefs and prefs.cities:
            return prefs.cities[0]

        city_counts = {}
        for p in (favs or []) + (views or []):
            if p.city:
                city_counts[p.city] = city_counts.get(p.city, 0) + 1

        if city_counts:
            return max(city_counts, key=city_counts.get)

        return None

    @staticmethod
    def _extract_interacted_ids(favs: List[Property], views: List[Property]) -> Set[str]:
        interacted_ids = set()
        for p in (favs or []) + (views or []):
            interacted_ids.add(str(p.id))
        return interacted_ids

    async def _fetch_candidates(self, filter_kwargs: dict, limit: int):
        all_rows = await self.prop_repo.get_all(limit=1000, **filter_kwargs)

        if not all_rows or len(all_rows) < limit:
            relaxed = {k: v for k, v in filter_kwargs.items() if k not in ('material', 'repair_type')}
            rows = await self.prop_repo.get_all(limit=1000, **relaxed)
            if len(rows) > len(all_rows):
                all_rows = rows

            if not all_rows or len(all_rows) < limit:
                for key in ('rooms', 'min_area', 'max_area', 'min_build_year', 'max_build_year'):
                    relaxed.pop(key, None)
                rows = await self.prop_repo.get_all(limit=1000, **relaxed)
                if len(rows) > len(all_rows):
                    all_rows = rows

                if not all_rows or len(all_rows) < limit:
                    for key in ('property_type', 'property_purpose'):
                        relaxed.pop(key, None)
                    rows = await self.prop_repo.get_all(limit=1000, **relaxed)
                    if len(rows) > len(all_rows):
                        all_rows = rows

                    if not all_rows or len(all_rows) < limit:
                        minimal = {}
                        min_p = filter_kwargs.get('min_price')
                        max_p = filter_kwargs.get('max_price')
                        if min_p is not None and max_p is not None:
                            price_range = max_p - min_p
                            minimal['min_price'] = max(0, min_p - price_range * 0.25)
                            minimal['max_price'] = max_p + price_range * 0.25
                        elif min_p is not None:
                            minimal['min_price'] = min_p * 0.5
                        elif max_p is not None:
                            minimal['max_price'] = max_p * 1.5
                        city_list = filter_kwargs.get('city')
                        if city_list:
                            minimal['city'] = city_list
                        if minimal:
                            rows = await self.prop_repo.get_all(limit=1000, **minimal)
                            if len(rows) > len(all_rows):
                                all_rows = rows

                            if not all_rows or len(all_rows) < limit:
                                rows = await self.prop_repo.get_all(limit=1000)
                                if len(rows) > len(all_rows):
                                    all_rows = rows

        return all_rows

    def _diversify(self, scored_props, prop_vectors, user_vec, limit, lambda_param=0.7):
        if not scored_props or limit >= len(scored_props):
            return [p for p, _ in scored_props]

        from sklearn.metrics.pairwise import cosine_similarity

        n = len(scored_props)
        properties = [p for p, _ in scored_props]
        scores = np.array([s for _, s in scored_props])
        pairwise_sim = cosine_similarity(prop_vectors)

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
