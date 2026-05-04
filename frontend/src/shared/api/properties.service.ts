import api from './api';
import type { Property } from '@entities/property/model/types';

export const propertyService = {
  async getProperties(params: Record<string, unknown> = {}): Promise<Property[]> {
    const response = await api.get('/api/properties', { params });
    return response.data;
  },

  async getPropertyById(id: string): Promise<Property> {
    const response = await api.get(`/api/properties/${id}`);
    return response.data;
  },

  async getPropertiesInBox(bounds: [number, number, number, number], filters: Record<string, unknown> = {}): Promise<Property[]> {
    const [north, east, south, west] = bounds;
    const params = {
      min_lat: south,
      max_lat: north,
      min_lon: west,
      max_lon: east,
      limit: 200,
      ...filters,
    };
    const response = await api.get('/api/properties/map', { params });
    return response.data;
  },
};
