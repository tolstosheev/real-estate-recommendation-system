import pytest
import numpy as np
from app.core.similarity import SimilarityUtils

def test_normalize_features():
    utils = SimilarityUtils()
    data = [[10, 100], [20, 200], [30, 300]]
    norm_data, scaler = utils.normalize_features(data)
    
    assert norm_data.shape == (3, 2)
    assert np.allclose(np.mean(norm_data, axis=0), 0)
    assert np.allclose(np.std(norm_data, axis=0), 1)

def test_calculate_cosine_similarity():
    utils = SimilarityUtils()
    vec_a = np.array([1, 0])
    vec_b = np.array([1, 0])
    vec_c = np.array([0, 1])
    
    assert utils.calculate_cosine_similarity(vec_a, vec_b) == pytest.approx(1.0)
    assert utils.calculate_cosine_similarity(vec_a, vec_c) == pytest.approx(0.0)

def test_compute_user_profile_vector():
    utils = SimilarityUtils()
    explicit = [100, 50, 2]
    implicit = [110, 60, 3]
    
    res = utils.compute_user_profile_vector(explicit, implicit)
    expected = (np.array(explicit) * 0.5) + (np.array(implicit) * 0.5)
    assert np.allclose(res, expected)
    
    res_exp = utils.compute_user_profile_vector(explicit, None)
    assert np.allclose(res_exp, np.array(explicit))
    
    res_imp = utils.compute_user_profile_vector(None, implicit)
    assert np.allclose(res_imp, np.array(implicit))
    
    assert utils.compute_user_profile_vector(None, None) is None
