from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.property_repository import PropertyRepository
from app.repositories.preferences_repository import UserPreferenceRepository
from app.repositories.interactions_repository import InteractionRepository
from app.core.similarity import SimilarityUtils
import numpy as np
from typing import List, Optional, Tuple
from app.models.models import Property

class RecommendationService:
    def __init__(self, session: AsyncSession):
        self.prop_repo = PropertyRepository(session)
        self.pref_repo = UserPreferenceRepository(session)
        self.inter_repo = InteractionRepository(session)
        self.utils = SimilarityUtils()

    def _get_property_vector(self, prop: Property) -> np.ndarray:
        return np.array([
            float(prop.price),
            float(prop.area) if prop.area else 0.0,
            float(prop.rooms) if prop.rooms else 0.0,
            float(prop.location.x) if hasattr(prop.location, 'x') else 0.0,
            float(prop.location.y) if hasattr(prop.location, 'y') else 0.0
        ])

    async def _build_user_vector(self, user_id: str) -> Optional[np.ndarray]:
        prefs = await self.pref_repo.get_by_user_id(user_id)
        explicit_vec = None
        if prefs:
            price = (float(prefs.min_price or 0) + float(prefs.max_price or 0)) / 2 if (prefs.min_price and prefs.max_price) else float(prefs.min_price or prefs.max_price or 0)
            area = (float(prefs.min_area or 0) + 100) / 2 if prefs.min_area else 50.0
            rooms = sum(prefs.preferred_rooms) / len(prefs.preferred_rooms) if prefs.preferred_rooms else 2.0
            explicit_vec = [price, area, rooms, 0.0, 0.0]

        favorites = await self.inter_repo.get_user_favorites(user_id)
        implicit_vec = None
        if favorites:
            fav_vectors = [self._get_property_vector(p) for p in favorites]
            implicit_vec = np.mean(fav_vectors, axis=0).tolist()

        return self.utils.compute_user_profile_vector(explicit_vec, implicit_vec)

    async def recommend(self, user_id: str, limit: int = 10) -> List[Property]:
        user_vec = await self._build_user_vector(user_id)
        all_rows = await self.prop_repo.get_all(limit=1000) 
        
        if not all_rows:
            return []

        if user_vec is None:
            return [row[0] for row in all_rows[:limit]]

        properties = [row[0] for row in all_rows]
        prop_vectors = np.array([self._get_property_vector(p) for p in properties])
        
        norm_prop_vectors, scaler = self.utils.normalize_features(prop_vectors.tolist())
        
        norm_user_vec = scaler.transform(user_vec.reshape(1, -1))[0]

        scored_props = []
        for i, prop in enumerate(properties):
            p_vec = norm_prop_vectors[i]
            score = self.utils.calculate_cosine_similarity(norm_user_vec, p_vec)
            scored_props.append((prop, score))

        scored_props.sort(key=lambda x: x[1], reverse=True)
        return [p for p, score in scored_props[:limit]]

