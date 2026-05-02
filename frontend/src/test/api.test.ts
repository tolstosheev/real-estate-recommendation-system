import { describe, it, expect, beforeEach } from 'vitest';
import api from '../shared/api/api';
import MockAdapter from 'axios-mock-adapter';

const mock = new MockAdapter(api);

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear();
    mock.reset();
  });

  it('should add authorization header when token exists', async () => {
    localStorage.setItem('accessToken', 'test-token');
    mock.onGet('/api/test').reply(200, { message: 'success' });
    
    const response = await api.get('/api/test');
    expect(response.status).toBe(200);
  });

  it('should handle 401 response by clearing token', async () => {
    localStorage.setItem('accessToken', 'invalid-token');
    
    delete (window as any).location;
    window.location = { href: '' } as any;

    mock.onGet('/api/protected').reply(401);

    try {
      await api.get('/api/protected');
    } catch (error: any) {
      expect(error.response?.status).toBe(401);
    }

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(window.location.href).toBe('/login');
  });
});
