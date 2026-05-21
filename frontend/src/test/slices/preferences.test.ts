import { describe, it, expect } from 'vitest';
import { preferencesReducer, fetchPreferences, updatePreferences } from '@entities/preferences/model/slice';

describe('preferences slice', () => {
  const initialState = {
    preferences: null,
    isLoading: false,
    error: null,
    isSaving: false,
  };

  it('should handle fetchPreferences.pending', () => {
    const state = preferencesReducer(initialState, { type: fetchPreferences.pending });
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should handle fetchPreferences.fulfilled', () => {
    const prefs = { min_price: 100000, max_price: 500000, user_id: '1' };
    const state = preferencesReducer(initialState, { type: fetchPreferences.fulfilled, payload: prefs });
    expect(state.isLoading).toBe(false);
    expect(state.preferences?.min_price).toBe(100000);
  });

  it('should handle fetchPreferences.rejected', () => {
    const state = preferencesReducer(initialState, { type: fetchPreferences.rejected, error: { message: 'Fail' } });
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Fail');
  });

  it('should handle updatePreferences.pending', () => {
    const state = preferencesReducer(initialState, { type: updatePreferences.pending });
    expect(state.isSaving).toBe(true);
  });

  it('should handle updatePreferences.fulfilled', () => {
    const prefs = { min_price: 200000, max_price: 600000, user_id: '1' };
    const state = preferencesReducer(initialState, { type: updatePreferences.fulfilled, payload: prefs });
    expect(state.isSaving).toBe(false);
    expect(state.preferences?.max_price).toBe(600000);
  });

  it('should handle updatePreferences.rejected', () => {
    const state = preferencesReducer(initialState, { type: updatePreferences.rejected, error: { message: 'Error' } });
    expect(state.isSaving).toBe(false);
    expect(state.error).toBe('Error');
  });

  it('should use default error messages', () => {
    const s1 = preferencesReducer(initialState, { type: fetchPreferences.rejected, error: {} });
    expect(s1.error).toBe('Failed to fetch preferences');

    const s2 = preferencesReducer(initialState, { type: updatePreferences.rejected, error: {} });
    expect(s2.error).toBe('Failed to update preferences');
  });
});
