import { describe, it, expect, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from '@shared/api/api';
import { recommendationsService } from '@shared/api/recommendations.service';
import { PropertyRecommendation } from '@entities/property/model/types';

const mock = new MockAdapter(api);

describe('recommendationsService', () => {
  beforeEach(() => {
    mock.reset();
  });

  it('should fetch recommendations successfully', async () => {
    const mockRecs: PropertyRecommendation[] = [
      {
        property: {
          id: '1',
          title: 'Modern Apartment',
          description: 'Beautiful flat',
          price: 200000,
          area: 60,
          rooms: 2,
          floor: 5,
          total_floors: 10,
          address: 'Main St 1',
          coordinates: [0, 0],
          photos: ['photo1.jpg'],
          ai_relevance: 0.95,
          created_at: '2026-01-01',
        },
        reason: 'Matches your preference for modern style',
        score: 0.95,
      },
    ];

    mock.onGet('/api/recommendations').reply(200, mockRecs);

    const result = await recommendationsService.getRecommendations();
    expect(result).toHaveLength(1);
    expect(result[0].property.id).toBe('1');
    expect(result[0].score).toBe(0.95);
  });

  it('should handle errors when fetching recommendations', async () => {
    mock.onGet('/api/recommendations').reply(500);

    await expect(recommendationsService.getRecommendations()).rejects.toThrow();
  });
});
