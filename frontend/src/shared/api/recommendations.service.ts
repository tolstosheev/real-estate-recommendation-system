import api from './api';
import type { PropertyRecommendation } from '@entities/property/model/types';

export const recommendationsService = {
  async getRecommendations(): Promise<PropertyRecommendation[]> {
    const response = await api.get('/api/recommendations');
    return response.data;
  },
};
