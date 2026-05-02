import api from './api';
import { UserPreferenceCreate } from '@entities/user/model/types';

export const preferencesService = {
  async updatePreferences(prefs: UserPreferenceCreate) {
    const response = await api.put('/user/preferences', prefs);
    return response.data;
  },
  async getPreferences() {
    const response = await api.get('/user/preferences');
    return response.data;
  },
};
