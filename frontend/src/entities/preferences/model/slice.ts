import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { preferencesService } from '@shared/api/preferences.service';
import type { UserPreferenceCreate, UserPreferenceOut } from '@shared/api/types';

interface PreferencesState {
  preferences: UserPreferenceOut | null;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
}

const initialState: PreferencesState = {
  preferences: null,
  isLoading: false,
  error: null,
  isSaving: false,
};

export const fetchPreferences = createAsyncThunk(
  'preferences/fetchPreferences',
  async () => {
    return await preferencesService.getPreferences();
  }
);

export const updatePreferences = createAsyncThunk(
  'preferences/updatePreferences',
  async (data: UserPreferenceCreate) => {
    return await preferencesService.updatePreferences(data);
  }
);

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPreferences.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPreferences.fulfilled, (state, action) => {
        state.isLoading = false;
        state.preferences = action.payload;
      })
      .addCase(fetchPreferences.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch preferences';
      })
      .addCase(updatePreferences.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.isSaving = false;
        state.preferences = action.payload;
      })
      .addCase(updatePreferences.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.error.message || 'Failed to update preferences';
      });
  },
});

export const preferencesReducer = preferencesSlice.reducer;
