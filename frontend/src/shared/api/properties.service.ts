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

  async createProperty(data: Partial<Property>): Promise<Property> {
    const response = await api.post('/api/properties/', data);
    return response.data;
  },

  async deleteProperty(id: string): Promise<void> {
    await api.delete(`/api/properties/${id}`);
  },

  async getMyProperties(): Promise<Property[]> {
    const response = await api.get('/api/properties/my');
    return response.data;
  },

  async getMeta(): Promise<{
    districts: string[];
    metro: string[];
    materials: string[];
    repair_types: string[];
    property_types: string[];
  }> {
    const response = await api.get('/api/properties/meta');
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
