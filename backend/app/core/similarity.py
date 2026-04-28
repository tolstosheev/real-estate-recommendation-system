import numpy as np
from typing import List
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler

class SimilarityUtils:
    @staticmethod
    def normalize_features(features: List[List[float]]):
        if not features:
            return np.array([])
        scaler = MinMaxScaler()
        return scaler.fit_transform(features)

    @staticmethod
    def calculate_cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
        # Ensure vectors are 2D for sklearn
        a = vec_a.reshape(1, -1)
        b = vec_b.reshape(1, -1)
        return float(cosine_similarity(a, b)[0][0])

    @staticmethod
    def compute_user_profile_vector(explicit_prefs: List[float], implicit_prefs: List[float], 
                                   explicit_weight: float = 0.7, implicit_weight: float = 0.3):
        if explicit_prefs is None and implicit_prefs is None:
            return None
        
        if explicit_prefs is None:
            return np.array(implicit_prefs)
        if implicit_prefs is None:
            return np.array(explicit_prefs)
            
        return (np.array(explicit_prefs) * explicit_weight) + (np.array(implicit_prefs) * implicit_weight)
