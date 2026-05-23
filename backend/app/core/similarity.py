
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler


class SimilarityUtils:
    @staticmethod
    def normalize_features(features: np.ndarray | list[list[float]]):
        if features is None or (isinstance(features, np.ndarray) and features.size == 0) or (not isinstance(features, np.ndarray) and not features):
            return np.array([]), None
        scaler = StandardScaler()
        return scaler.fit_transform(features), scaler

    @staticmethod
    def calculate_cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
        a = vec_a.reshape(1, -1)
        b = vec_b.reshape(1, -1)
        return float(cosine_similarity(a, b)[0][0])

    @staticmethod
    def compute_user_profile_vector(
        explicit_prefs: list[float] | None,
        implicit_prefs: list[float] | None,
        explicit_weight: float = 0.6,
        implicit_weight: float = 0.4,
    ):
        if explicit_prefs is None and implicit_prefs is None:
            return None

        if explicit_prefs is None:
            return np.array(implicit_prefs)
        if implicit_prefs is None:
            return np.array(explicit_prefs)

        return np.array(explicit_prefs) * explicit_weight + np.array(implicit_prefs) * implicit_weight
