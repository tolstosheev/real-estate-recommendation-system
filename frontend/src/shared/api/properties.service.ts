import api from './api';
import type { Property } from './types';

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

  async updateProperty(id: string, data: Partial<Property>): Promise<Property> {
    const response = await api.put(`/api/properties/${id}`, data);
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
    cities: string[];
  }> {
    const response = await api.get('/api/properties/meta');
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
