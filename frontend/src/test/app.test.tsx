import { render, screen, waitFor } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import App from '../App';

const createMockStore = (isAuthenticated = false) => {
  const initialState = {
    auth: {
      user: null,
      token: isAuthenticated ? 'fake-token' : null,
      isAuthenticated,
    },
  };

  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: initialState,
  });
};

test('redirects unauthenticated user to onboarding', () => {
  const store = createMockStore(false);
  render(
    <Provider store={store}>
      <App />
    </Provider>
  );
  expect(screen.getByText(/Welcome to nestAI/i)).toBeInTheDocument();
});

test('shows home to authenticated user', async () => {
  const store = createMockStore(true);
  render(
    <Provider store={store}>
      <App />
    </Provider>
  );
  await waitFor(() => {
    expect(screen.getByText(/Find Your Dream Home/i)).toBeInTheDocument();
  });
});
