import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import App from '../App';

const mockStore = configureStore({
  reducer: {
    auth: authReducer,
  },
});

test('renders app component', () => {
  render(
    <Provider store={mockStore}>
      <App />
    </Provider>
  );
  expect(screen.getByText(/Find Your Dream Home/i)).toBeInTheDocument();
});
