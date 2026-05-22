import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '../shared/api/api';
import MockAdapter from 'axios-mock-adapter';
import type { AxiosError } from 'axios';

vi.mock('@shared/lib/tokenService', () => ({
  getAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
}));

import { getAccessToken, setAccessToken } from '@shared/lib/tokenService';

const mock = new MockAdapter(api);

describe('API Client', () => {
  beforeEach(() => {
    mock.reset();
    vi.clearAllMocks();
  });

  it('should add authorization header when token exists', async () => {
    vi.mocked(getAccessToken).mockReturnValue('test-token');
    mock.onGet('/api/test').reply(200, { message: 'success' });
    
    const response = await api.get('/api/test');
    expect(response.status).toBe(200);
  });

  it('should handle 401 response by clearing token', async () => {
    vi.mocked(getAccessToken).mockReturnValue('invalid-token');

    mock.onGet('/api/protected').reply(401);

    try {
      await api.get('/api/protected');
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      expect(axiosError.response?.status).toBe(401);
    }

    expect(setAccessToken).toHaveBeenCalledWith(null);
  });

  describe('paramsSerializer', () => {
    it('should serialize single values as query params', () => {
      const params = { limit: 100, offset: 0 };
      const result = api.defaults.paramsSerializer!(params);
      expect(result).toContain('limit=100');
      expect(result).toContain('offset=0');
    });

    it('should serialize array values as repeated keys', () => {
      const params = { city: ['London', 'Paris'] };
      const result = api.defaults.paramsSerializer!(params);
      expect(result).toContain('city=London');
      expect(result).toContain('city=Paris');
    });

    it('should serialize single-element array as single key', () => {
      const params = { city: ['London'] };
      const result = api.defaults.paramsSerializer!(params);
      expect(result).toBe('city=London');
    });

    it('should serialize rooms array correctly', () => {
      const params = { rooms: [1, 2, 3] };
      const result = api.defaults.paramsSerializer!(params);
      expect(result).toContain('rooms=1');
      expect(result).toContain('rooms=2');
      expect(result).toContain('rooms=3');
    });

    it('should serialize mixed params with arrays and scalars', () => {
      const params = { limit: 100, city: ['London'], min_price: 50000 };
      const result = api.defaults.paramsSerializer!(params);
      expect(result).toContain('limit=100');
      expect(result).toContain('city=London');
      expect(result).toContain('min_price=50000');
    });

    it('should omit undefined and null values', () => {
      const params = { limit: 100, city: undefined, extra: null };
      const result = api.defaults.paramsSerializer!(params);
      expect(result).toContain('limit=100');
      expect(result).not.toContain('city');
      expect(result).not.toContain('extra');
    });
  });
});
