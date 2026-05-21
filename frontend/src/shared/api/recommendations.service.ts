import api from './api';
import type { PropertyRecommendation } from './types';

interface RecommendationResponse extends Omit<PropertyRecommendation, 'is_ai_recommendation'> {
  is_ai_recommendation?: boolean;
}

export const recommendationsService = {
  async getRecommendations(): Promise<PropertyRecommendation[]> {
    const response = await api.get('/api/recommendations');
    return response.data.map((prop: RecommendationResponse) => ({
      ...prop,
      is_ai_recommendation: true
    }));
  },
};
