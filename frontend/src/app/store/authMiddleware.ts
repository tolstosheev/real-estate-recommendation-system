import type { Middleware } from '@reduxjs/toolkit';
import { logout } from '@entities/user/model/slice';
import { setAccessToken } from '@shared/lib/tokenService';

export const authMiddleware: Middleware = () => (next) => (action) => {
  if (action.type === logout.type) {
    setAccessToken(null);
  }
  return next(action);
};
