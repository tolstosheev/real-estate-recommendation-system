import type { Middleware } from '@reduxjs/toolkit';
import { logout } from '@entities/user/model/slice';
import { setAccessToken } from '@shared/lib/tokenService';

export const authMiddleware: Middleware = () => (next) => (action) => {
  if ((action as { type: string }).type === logout.type) {
    setAccessToken(null);
  }
  return next(action);
};
