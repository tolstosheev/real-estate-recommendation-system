import api from './api';
import type { User } from '@entities/user/model/types';

interface AuthResponse {
  access_token: string;
  user: User;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  full_name: string;
  email: string;
  password: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  async register(userData: RegisterData): Promise<User> {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
};
