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
    def __init__(self, session: AsyncSession):
        self.prop_repo = PropertyRepository(session)
        self.pref_repo = UserPreferenceRepository(session)
        self.inter_repo = InteractionRepository(session)
        self.utils = SimilarityUtils()

    def _get_property_vector(self, prop: Property, lon: float = 0.0, lat: float = 0.0) -> np.ndarray:
        return np.array(
            [
                float(prop.price),
                float(prop.area) if prop.area else 0.0,
                float(prop.rooms) if prop.rooms else 0.0,
                float(lon),
                float(lat),
                float(prop.build_year) if prop.build_year else 2000.0,
            ]
        )

    async def _build_user_vector(self, user_id: str) -> Optional[np.ndarray]:
        redis = await RedisClient.get_client()
        if redis:
            cache_key = f"user_vec:{user_id}"
            cached_vec = await redis.get(cache_key)
            if cached_vec:
                return np.array(json.loads(cached_vec))

        prefs = await self.pref_repo.get_by_user_id(user_id)
        explicit_vec = None
        if prefs:
            price = (
                (float(prefs.min_price or 0) + float(prefs.max_price or 0)) / 2
                if (prefs.min_price and prefs.max_price)
                else float(prefs.min_price or prefs.max_price or 0)
            )
            area = (float(prefs.min_area or 0) + 100) / 2 if prefs.min_area else 50.0
            rooms = sum(prefs.preferred_rooms) / len(prefs.preferred_rooms) if prefs.preferred_rooms else 2.0
            # Добавляем build_year в вектор (используем среднее между min и max)
            if prefs.min_build_year and prefs.max_build_year:
                build_year = (prefs.min_build_year + prefs.max_build_year) / 2
            else:
                build_year = prefs.min_build_year or prefs.max_build_year or 2000
            explicit_vec = [price, area, rooms, 0.0, 0.0, build_year]

        favorites = await self.inter_repo.get_user_favorites(user_id)
        implicit_vec = None
        if favorites:
            fav_vectors = []
            for p in favorites:
                res = await self.prop_repo.get_by_id(p.id)
                if res:
                    fav_vectors.append(self._get_property_vector(res[0], res[1], res[2]))

            if fav_vectors:
                implicit_vec = np.mean(fav_vectors, axis=0).tolist()

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

        # Получаем предпочтения пользователя для фильтрации
        prefs = await self.pref_repo.get_by_user_id(user_id)

        # Базовые параметры фильтрации из предпочтений
        filter_kwargs = {}
        if prefs:
            if prefs.district:
                filter_kwargs['district'] = prefs.district
            if prefs.metro:
                filter_kwargs['metro'] = prefs.metro
            if prefs.material:
                filter_kwargs['material'] = prefs.material
            if prefs.repair_type:
                filter_kwargs['repair_type'] = prefs.repair_type
            if prefs.min_build_year:
                filter_kwargs['min_build_year'] = prefs.min_build_year
            if prefs.max_build_year:
                filter_kwargs['max_build_year'] = prefs.max_build_year

        user_vec = await self._build_user_vector(user_id)
        all_rows = await self.prop_repo.get_all(limit=1000, **filter_kwargs)

        if not all_rows:
            return []

        if user_vec is None:
            return [row[0] for row in all_rows[:limit]]

        properties = [row[0] for row in all_rows]
        prop_vectors = np.array([self._get_property_vector(row[0], row[1], row[2]) for row in all_rows])

        mean_coords = np.mean(prop_vectors[:, 3:], axis=0)
        if user_vec[3] == 0.0 and user_vec[4] == 0.0:
            user_vec[3:] = mean_coords

        norm_prop_vectors, scaler = self.utils.normalize_features(prop_vectors.tolist())
        norm_user_vec = scaler.transform(user_vec.reshape(1, -1))[0]

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
