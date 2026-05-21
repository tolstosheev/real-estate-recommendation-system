import { describe, it, expect, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from '@shared/api/api';
import { preferencesService } from '@shared/api/preferences.service';

const mock = new MockAdapter(api);

describe('preferencesService', () => {
  beforeEach(() => {
    mock.reset();
  });

  it('should update preferences successfully', async () => {
    const prefs = {
      min_price: 100000,
      max_price: 500000,
      min_area: 50,
      preferred_rooms: [2, 3],
      tags: ['Modern', 'Center'],
    };

    mock.onPut('/user/preferences').reply(200, { ...prefs, user_id: 'user-123' });

    const result = await preferencesService.updatePreferences(prefs);
    expect(result.user_id).toBe('user-123');
    expect(result.min_price).toBe(100000);
  });

  it('should get preferences successfully', async () => {
    const prefs = {
      min_price: 100000,
      max_price: 500000,
      user_id: 'user-123',
    };

    mock.onGet('/user/preferences').reply(200, prefs);

    const result = await preferencesService.getPreferences();
    expect(result.user_id).toBe('user-123');
    expect(result.min_price).toBe(100000);
  });

  it('should handle errors when updating preferences', async () => {
    mock.onPut('/user/preferences').reply(400, { detail: 'Invalid data' });

    await expect(preferencesService.updatePreferences({})).rejects.toThrow();
  });

  it('should handle errors when getting preferences', async () => {
    mock.onGet('/user/preferences').reply(500);

    await expect(preferencesService.getPreferences()).rejects.toThrow();
  });

  it('should handle network failure when updating preferences', async () => {
    mock.onPut('/user/preferences').networkError();

    await expect(preferencesService.updatePreferences({})).rejects.toThrow();
  });

  it('should handle network failure when getting preferences', async () => {
    mock.onGet('/user/preferences').networkError();

    await expect(preferencesService.getPreferences()).rejects.toThrow();
  });
});
