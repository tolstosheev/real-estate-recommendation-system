import { describe, it, expect, beforeEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from '@shared/api/api';
import { authService } from '@shared/api/auth.service';

vi.mock('@shared/lib/tokenService', () => ({
  getAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
}));

import { getAccessToken } from '@shared/lib/tokenService';

const mock = new MockAdapter(api);

describe('authService', () => {
  beforeEach(() => {
    mock.reset();
    vi.clearAllMocks();
  });

  it('should login successfully and return token', async () => {
    const loginData = { email: 'test@test.com', password: 'password123' };
    mock.onPost('/auth/login').reply(200, { access_token: 'test-jwt-token', token_type: 'bearer' });

    const result = await authService.login(loginData);
    
    expect(result.access_token).toBe('test-jwt-token');
    expect(result.token_type).toBe('bearer');
  });

  it('should register successfully and return user data', async () => {
    const registerData = {
      email: 'new@test.com',
      password: 'password123',
      full_name: 'New User',
    };
    mock.onPost('/auth/register').reply(201, { 
      id: 'user-1',
      email: 'new@test.com',
      full_name: 'New User',
    });

    const result = await authService.register(registerData);
    
    expect(result.email).toBe('new@test.com');
    expect(result.full_name).toBe('New User');
  });

  it('should get current user successfully', async () => {
    vi.mocked(getAccessToken).mockReturnValue('valid-token');
    const userData = {
      id: 'user-1',
      email: 'test@test.com',
      full_name: 'Test User',
    };
    mock.onGet('/auth/me').reply(200, userData);

    const result = await authService.getCurrentUser();
    
    expect(result.email).toBe('test@test.com');
    expect(result.full_name).toBe('Test User');
  });

  it('should handle login failure', async () => {
    const loginData = { email: 'wrong@test.com', password: 'wrong' };
    mock.onPost('/auth/login').reply(401, { detail: 'Invalid credentials' });

    await expect(authService.login(loginData)).rejects.toThrow();
  });

  it('should handle registration validation errors', async () => {
    const registerData = {
      email: 'invalid-email',
      password: 'short',
      full_name: '',
    };
    mock.onPost('/auth/register').reply(422, { detail: 'Validation error' });

    await expect(authService.register(registerData)).rejects.toThrow();
  });

  it('should handle getCurrentUser when unauthorized', async () => {
    mock.onGet('/auth/me').reply(401);

    await expect(authService.getCurrentUser()).rejects.toThrow();
  });

  it('should update profile successfully', async () => {
    const updateData = { full_name: 'Updated User', phone_number: '+79991234567' };
    const updatedUser = { id: 'user-1', email: 'test@test.com', full_name: 'Updated User', phone_number: '+79991234567' };
    mock.onPut('/auth/me').reply(200, updatedUser);

    const result = await authService.updateProfile(updateData);

    expect(result.full_name).toBe('Updated User');
    expect(result.phone_number).toBe('+79991234567');
  });
});
