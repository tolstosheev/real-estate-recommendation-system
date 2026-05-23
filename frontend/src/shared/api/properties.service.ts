import api from './api';
import type { Property } from './types';

export const propertyService = {
  async getProperties(params: Record<string, unknown> = {}, signal?: AbortSignal): Promise<Property[]> {
    const response = await api.get('/api/properties', { params, signal });
    return response.data;
  },

  async getPropertyById(id: string, signal?: AbortSignal): Promise<Property> {
    const response = await api.get(`/api/properties/${id}`, { signal });
    return response.data;
  },

  async createProperty(data: Partial<Property>): Promise<Property> {
    const response = await api.post('/api/properties/', data);
    return response.data;
  },

  async updateProperty(id: string, data: Partial<Property>): Promise<Property> {
    const response = await api.put(`/api/properties/${id}`, data);
    return response.data;
  },

  async deleteProperty(id: string): Promise<void> {
    await api.delete(`/api/properties/${id}`);
  },

  async getMyProperties(signal?: AbortSignal): Promise<Property[]> {
    const response = await api.get('/api/properties/my', { signal });
    return response.data;
  },

  async getMeta(signal?: AbortSignal): Promise<{
    districts: string[];
    metro: string[];
    materials: string[];
    repair_types: string[];
    property_types: string[];
    cities: string[];
    city_centers: Record<string, [number, number]>;
  }> {
    const response = await api.get('/api/properties/meta', { signal });
    return response.data;
  },

  async uploadImages(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const response = await api.post('/api/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.urls;
  },

  async getPropertiesInBox(bounds: [number, number, number, number], filters: Record<string, unknown> = {}, signal?: AbortSignal): Promise<Property[]> {
    const [north, east, south, west] = bounds;
    const params = {
      min_lat: south,
      max_lat: north,
      min_lon: west,
      max_lon: east,
      limit: 200,
      ...filters,
    };
    const response = await api.get('/api/properties/map', { params, signal });
    return response.data;
  },
};
