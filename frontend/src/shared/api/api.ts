import axios from 'axios';
import type { AxiosError } from 'axios';

import { getAccessToken, setAccessToken } from '@shared/lib/tokenService';
import { store } from '@app/store/store';
import { logout } from '@entities/user/model/slice';

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/me'];

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  paramsSerializer: (params) => {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(v)));
      } else if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    return searchParams.toString();
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  const queue = failedQueue;
  failedQueue = [];
  for (const { resolve, reject } of queue) {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    } else {
      reject(new Error('No token available'));
    }
  }
}

export function __resetRefreshState(): void {
  isRefreshing = false;
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as unknown as Record<string, unknown> & { _retry?: boolean; url?: string };

    if (error.response?.status === 401 && !originalRequest?._retry) {
      const url = originalRequest?.url || '';
      if (AUTH_PATHS.some(p => url.startsWith(p))) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const token = getAccessToken();
        if (!token) {
          store.dispatch(logout());
          return Promise.reject(error);
        }
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setAccessToken(data.access_token);
        processQueue(null, data.access_token);
        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${data.access_token}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        store.dispatch(logout());
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
