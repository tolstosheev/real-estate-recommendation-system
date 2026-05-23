import api from '@shared/api/api';
import type { UserPreferenceCreate, UserPreferenceOut } from '@shared/api/types';

export const preferencesService = {
  async getPreferences(signal?: AbortSignal): Promise<UserPreferenceOut> {
    const response = await api.get('/user/preferences', { signal });
    return response.data;
  },
  async updatePreferences(data: UserPreferenceCreate): Promise<UserPreferenceOut> {
    const response = await api.put('/user/preferences', data);
    return response.data;
  },
};
