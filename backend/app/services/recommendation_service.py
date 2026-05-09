from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.property_repository import PropertyRepository
from app.repositories.preferences_repository import UserPreferenceRepository
from app.repositories.interactions_repository import InteractionRepository
from app.core.similarity import SimilarityUtils
from app.core.redis import RedisClient
import numpy as np
import json
from typing import List, Optional
from app.models.models import Property


class RecommendationService:
    VECTOR_DIM = 13

    FEATURE_WEIGHTS = np.array([
        3.0,  # 0: price
        1.0,  # 1: area
        1.0,  # 2: rooms
        1.0,  # 3: lon
        1.0,  # 4: lat
        1.0,  # 5: build_year
        1.0,  # 6: apartment
        1.0,  # 7: studio
        1.0,  # 8: house
        1.0,  # 9: townhouse
        3.0,  # 10: sale
        3.0,  # 11: rent
        10.0,  # 12: city_match
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

        filter_kwargs = {}
        if prefs:
            if prefs.material:
                filter_kwargs['material'] = [prefs.material]
            if prefs.repair_type:
                filter_kwargs['repair_type'] = [prefs.repair_type]
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
            if prefs.min_area:
                filter_kwargs['min_area'] = prefs.min_area
            if prefs.max_area:
                filter_kwargs['max_area'] = prefs.max_area

        preferred_city = prefs.cities[0] if prefs and prefs.cities else None

        if not preferred_city:
            favs = await self.inter_repo.get_user_favorites(user_id)
            views = await self.inter_repo.get_user_view_history(user_id)
            city_counts = {}
            for p in (favs or []) + (views or []):
                if p.city:
                    city_counts[p.city] = city_counts.get(p.city, 0) + 1
            if city_counts:
                preferred_city = max(city_counts, key=city_counts.get)

        user_vec = await self._build_user_vector(user_id, preferred_city)
        all_rows = await self.prop_repo.get_all(limit=1000, **filter_kwargs)

        if not all_rows or len(all_rows) < limit:
            relaxed_filters = filter_kwargs.copy()
            for key in ('material', 'repair_type', 'rooms', 'property_type', 'property_purpose', 'min_area', 'max_area'):
                relaxed_filters.pop(key, None)
            relaxed_rows = await self.prop_repo.get_all(limit=1000, **relaxed_filters)
            if relaxed_rows and (not all_rows or len(relaxed_rows) > len(all_rows)):
                all_rows = relaxed_rows

            if not all_rows or len(all_rows) < limit:
                all_rows = await self.prop_repo.get_all(limit=1000)

        if not all_rows:
            return []

        if user_vec is None:
            return [row[0] for row in all_rows[:limit]]

        if not preferred_city:
            city_counts = {}
            for row in all_rows:
                if row[0].city:
                    city_counts[row[0].city] = city_counts.get(row[0].city, 0) + 1
            if city_counts:
                preferred_city = max(city_counts, key=city_counts.get)

        properties = [row[0] for row in all_rows]
        prop_vectors = np.array([
            self._get_property_vector(row[0], row[1], row[2], preferred_city) for row in all_rows
        ])

        mean_coords = np.mean(prop_vectors[:, 3:5], axis=0)
        if user_vec[3] == 0.0 and user_vec[4] == 0.0:
            user_vec[3:5] = mean_coords

        norm_prop_vectors, scaler = self.utils.normalize_features(prop_vectors.tolist())
        norm_user_vec = scaler.transform(user_vec.reshape(1, -1))[0]

        norm_prop_vectors *= self.FEATURE_WEIGHTS
        norm_user_vec *= self.FEATURE_WEIGHTS

        scored_props = []
        for i, prop in enumerate(properties):
            p_vec = norm_prop_vectors[i]
            score = self.utils.calculate_cosine_similarity(norm_user_vec, p_vec)
            scored_props.append((prop, score))

        scored_props.sort(key=lambda x: x[1], reverse=True)
        top_props = [p for p, score in scored_props[:limit]]

        if top_props and redis:
            prop_ids = [str(p.id) for p in top_props]
            prop_ids_str = json.dumps(prop_ids)
            await redis.setex(f"user_recs:{user_id}:{limit}", 3600, prop_ids_str)

        return top_props
