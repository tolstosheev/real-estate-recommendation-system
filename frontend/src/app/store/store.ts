import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import { propertyReducer } from '@entities/property/model/slice';
import { preferencesReducer } from '@entities/preferences/model/slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    property: propertyReducer,
    preferences: preferencesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
