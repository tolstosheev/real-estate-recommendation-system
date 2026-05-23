import api from './api';
import type { PropertyRecommendation } from './types';

interface RecommendationResponse extends Omit<PropertyRecommendation, 'is_ai_recommendation'> {
  is_ai_recommendation?: boolean;
}

export const recommendationsService = {
  async getRecommendations(options?: { signal?: AbortSignal }): Promise<PropertyRecommendation[]> {
    const response = await api.get('/api/recommendations', options || {});
    return response.data.map((prop: RecommendationResponse) => ({
      ...prop,
      is_ai_recommendation: true
    }));
  },
};
