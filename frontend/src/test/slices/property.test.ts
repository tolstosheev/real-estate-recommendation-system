import { describe, it, expect } from 'vitest';
import { propertyReducer, fetchProperties, fetchPropertyById, clearCurrentProperty } from '@entities/property/model/slice';
import type { Property } from '@entities/property/model/types';

describe('property slice', () => {
  const initialState = {
    properties: [],
    currentProperty: null,
    isLoading: false,
    error: null,
  };

  it('should handle clearCurrentProperty', () => {
    const stateWith = { ...initialState, currentProperty: { id: '1' } as unknown as Property };
    const state = propertyReducer(stateWith, clearCurrentProperty());
    expect(state.currentProperty).toBeNull();
  });

  it('should handle fetchProperties.pending', () => {
    const state = propertyReducer(initialState, { type: fetchProperties.pending });
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should handle fetchProperties.fulfilled', () => {
    const props = [{ id: '1', title: 'Test' }] as unknown as Property[];
    const state = propertyReducer(initialState, { type: fetchProperties.fulfilled, payload: props });
    expect(state.isLoading).toBe(false);
    expect(state.properties).toHaveLength(1);
  });

  it('should handle fetchProperties.rejected', () => {
    const state = propertyReducer(initialState, { type: fetchProperties.rejected, error: { message: 'Error' } });
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Error');
  });

  it('should handle fetchPropertyById.pending', () => {
    const state = propertyReducer(initialState, { type: fetchPropertyById.pending });
    expect(state.isLoading).toBe(true);
  });

  it('should handle fetchPropertyById.fulfilled', () => {
    const prop = { id: '1', title: 'Detail' } as unknown as Property;
    const state = propertyReducer(initialState, { type: fetchPropertyById.fulfilled, payload: prop });
    expect(state.isLoading).toBe(false);
    expect(state.currentProperty?.title).toBe('Detail');
  });

  it('should handle fetchPropertyById.rejected', () => {
    const state = propertyReducer(initialState, { type: fetchPropertyById.rejected, error: { message: 'Not found' } });
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Not found');
  });

  it('should use default error message on rejected', () => {
    const state = propertyReducer(initialState, { type: fetchProperties.rejected, error: {} });
    expect(state.error).toBe('Failed to fetch properties');
  });
});
