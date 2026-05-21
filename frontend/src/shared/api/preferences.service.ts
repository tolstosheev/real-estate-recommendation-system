import api from '@shared/api/api';
import type { UserPreferenceCreate, UserPreferenceOut } from '@shared/api/types';

export const preferencesService = {
  async getPreferences(): Promise<UserPreferenceOut> {
    const response = await api.get('/user/preferences');
    return response.data;
  },
  async updatePreferences(data: UserPreferenceCreate): Promise<UserPreferenceOut> {
    const response = await api.put('/user/preferences', data);
    return response.data;
  },
};
