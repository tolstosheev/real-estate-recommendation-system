import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import api, { __resetRefreshState } from '../shared/api/api';
import MockAdapter from 'axios-mock-adapter';
import type { AxiosError } from 'axios';
import axios from 'axios';

vi.mock('@shared/lib/tokenService', () => ({
  getAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
}));

vi.mock('@app/store/store', () => ({
  store: { dispatch: vi.fn() },
}));

vi.mock('@entities/user/model/slice', () => ({
  logout: vi.fn(() => ({ type: 'auth/logout' })),
}));

import { getAccessToken, setAccessToken } from '@shared/lib/tokenService';
import { store } from '@app/store/store';
import { logout } from '@entities/user/model/slice';

const mock = new MockAdapter(api);

describe('API Client', () => {
  beforeEach(() => {
    mock.reset();
    vi.clearAllMocks();
    __resetRefreshState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should add authorization header when token exists', async () => {
    vi.mocked(getAccessToken).mockReturnValue('test-token');
    mock.onGet('/api/test').reply(200, { message: 'success' });

    const response = await api.get('/api/test');
    expect(response.status).toBe(200);
  });

  describe('token refresh on 401', () => {
    it('should attempt refresh and retry original request on success', async () => {
      vi.mocked(getAccessToken).mockReturnValue('old-token');
      const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
        data: { access_token: 'new-token' },
      });

      mock.onGet('/api/protected').replyOnce(401).onGet('/api/protected').reply(200, { ok: true });

      const response = await api.get('/api/protected');

      expect(postSpy).toHaveBeenCalledWith(
        'http://localhost:8000/auth/refresh',
        {},
        expect.objectContaining({
          headers: { Authorization: 'Bearer old-token' },
        }),
      );
      expect(setAccessToken).toHaveBeenCalledWith('new-token');
      expect(response.data).toEqual({ ok: true });
    });

    it('should clear token, dispatch logout, and propagate refresh error', async () => {
      vi.mocked(getAccessToken).mockReturnValue('old-token');
      const refreshError = new Error('refresh-failed');
      vi.spyOn(axios, 'post').mockRejectedValueOnce(refreshError);

      mock.onGet('/api/protected').reply(401);

      await expect(api.get('/api/protected')).rejects.toThrow('refresh-failed');

      expect(setAccessToken).toHaveBeenCalledWith(null);
      expect(store.dispatch).toHaveBeenCalledWith(logout());
    });

    it('should not attempt refresh for auth endpoints', async () => {
      const postSpy = vi.spyOn(axios, 'post');

      mock.onPost('/auth/login').reply(401);

      await expect(api.post('/auth/login', {})).rejects.toThrow();

      expect(postSpy).not.toHaveBeenCalled();
    });

    it('should queue concurrent 401s and retry all after a single refresh', async () => {
      vi.mocked(getAccessToken).mockReturnValue('old-token');
      const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
        data: { access_token: 'new-token' },
      });

      mock.onGet('/api/ep1').replyOnce(401).onGet('/api/ep1').reply(200, { a: 1 });
      mock.onGet('/api/ep2').replyOnce(401).onGet('/api/ep2').reply(200, { b: 2 });

      const [r1, r2] = await Promise.all([
        api.get('/api/ep1'),
        api.get('/api/ep2'),
      ]);

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(setAccessToken).toHaveBeenCalledWith('new-token');
      expect(r1.data).toEqual({ a: 1 });
      expect(r2.data).toEqual({ b: 2 });
    });

    it('should reject all queued requests when refresh fails', async () => {
      vi.mocked(getAccessToken).mockReturnValue('old-token');
      const refreshError = new Error('refresh-failed');
      vi.spyOn(axios, 'post').mockRejectedValueOnce(refreshError);

      mock.onGet('/api/ep1').replyOnce(401);
      mock.onGet('/api/ep2').replyOnce(401);

      const [r1, r2] = await Promise.allSettled([
        api.get('/api/ep1'),
        api.get('/api/ep2'),
      ]);

      expect(r1.status).toBe('rejected');
      expect(r2.status).toBe('rejected');
      expect(setAccessToken).toHaveBeenCalledWith(null);
      expect(store.dispatch).toHaveBeenCalledWith(logout());
    });

    it('should not retry refresh when retried request still returns 401', async () => {
      vi.mocked(getAccessToken).mockReturnValue('old-token');
      const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
        data: { access_token: 'new-token' },
      });

      mock.onGet('/api/protected').replyOnce(401).onGet('/api/protected').reply(401);

      await expect(api.get('/api/protected')).rejects.toThrow();

      expect(postSpy).toHaveBeenCalledTimes(1);
    });

    it('should not send refresh request when token is null', async () => {
      vi.mocked(getAccessToken).mockReturnValue(null);
      const postSpy = vi.spyOn(axios, 'post');

      mock.onGet('/api/protected').reply(401);

      await expect(api.get('/api/protected')).rejects.toThrow();

      expect(postSpy).not.toHaveBeenCalled();
    });

    it('should not refresh on non-401 errors', async () => {
      const postSpy = vi.spyOn(axios, 'post');
      mock.onGet('/api/test').reply(403);

      await expect(api.get('/api/test')).rejects.toThrow();

      expect(postSpy).not.toHaveBeenCalled();
    });
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
