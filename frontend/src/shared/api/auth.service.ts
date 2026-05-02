import api from './api';
import { UserPreferenceOut } from '@entities/user/model/types';

export const authService = {
  async login(credentials: any) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  async register(userData: any) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
};
