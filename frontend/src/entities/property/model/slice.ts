import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { propertyService } from '@shared/api/properties.service';
import type { Property } from '../model/types';

interface PropertyState {
  properties: Property[];
  currentProperty: Property | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: PropertyState = {
  properties: [],
  currentProperty: null,
  isLoading: false,
  error: null,
};

export const fetchProperties = createAsyncThunk(
  'property/fetchProperties',
  async (params: Record<string, unknown>) => {
    return await propertyService.getProperties(params);
  }
);

export const fetchPropertyById = createAsyncThunk(
  'property/fetchPropertyById',
  async (id: string) => {
    return await propertyService.getPropertyById(id);
  }
);

const propertySlice = createSlice({
  name: 'property',
  initialState,
  reducers: {
    clearCurrentProperty: (state) => {
      state.currentProperty = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProperties.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProperties.fulfilled, (state, action) => {
        state.isLoading = false;
        state.properties = action.payload;
      })
      .addCase(fetchProperties.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch properties';
      })
      .addCase(fetchPropertyById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPropertyById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProperty = action.payload;
      })
      .addCase(fetchPropertyById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch property';
      });
  },
});

export const { clearCurrentProperty } = propertySlice.actions;
export const propertyReducer = propertySlice.reducer;
