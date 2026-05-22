import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import { propertyReducer } from '@entities/property/model/slice';
import { preferencesReducer } from '@entities/preferences/model/slice';
import { authMiddleware } from './authMiddleware';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    property: propertyReducer,
    preferences: preferencesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
