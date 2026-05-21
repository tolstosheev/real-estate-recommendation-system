import api from './api';
import type { User } from './types';

interface AuthResponse {
  access_token: string;
  token_type: string;
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
  phone_number?: string;
  telegram_handle?: string;
}

interface UpdateProfileData {
  full_name?: string;
  phone_number?: string;
  telegram_handle?: string;
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
  async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data;
  },
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await api.put('/auth/me', data);
    return response.data;
  },
};
