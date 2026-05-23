import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import { authMiddleware } from './authMiddleware';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
