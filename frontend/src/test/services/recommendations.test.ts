import { describe, it, expect, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from '@shared/api/api';
import { recommendationsService } from '@shared/api/recommendations.service';
import type { PropertyRecommendation } from '@entities/property/model/types';

const mock = new MockAdapter(api);

describe('recommendationsService', () => {
  beforeEach(() => {
    mock.reset();
  });

  it('should fetch recommendations successfully', async () => {
    const mockRecs: PropertyRecommendation[] = [
      {
        id: '1',
        title: 'Modern Apartment',
        description: 'Beautiful flat',
        price: 200000,
        area: 60,
        rooms: 2,
        floor: 5,
        total_floors: 10,
        property_type: 'Apartment',
        address: 'Main St 1',
        lat: 55.7558,
        lon: 37.6173,
        images: ['photo1.jpg'],
        owner: {
          full_name: 'John Doe',
          phone_number: '+79991234567',
          telegram_handle: '@johndoe',
        },
      },
    ];

    mock.onGet('/api/recommendations').reply(200, mockRecs);

    const result = await recommendationsService.getRecommendations();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].title).toBe('Modern Apartment');
  });

  it('should handle errors when fetching recommendations', async () => {
    mock.onGet('/api/recommendations').reply(500);

    await expect(recommendationsService.getRecommendations()).rejects.toThrow();
  });

  it('should return empty array when no recommendations available', async () => {
    mock.onGet('/api/recommendations').reply(200, []);

    const result = await recommendationsService.getRecommendations();
    expect(result).toHaveLength(0);
  });

  it('should handle network failure gracefully', async () => {
    mock.onGet('/api/recommendations').networkError();

    await expect(recommendationsService.getRecommendations()).rejects.toThrow();
  });

  it('should handle malformed response data', async () => {
    mock.onGet('/api/recommendations').reply(200, { invalid: 'data' });

    const result = await recommendationsService.getRecommendations();
    expect(Array.isArray(result)).toBe(false);
  });
});
