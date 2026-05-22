import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import { InitApp } from '@app/InitApp';

vi.mock('@shared/lib/tokenService', () => ({
  getAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
}));

import { getAccessToken, setAccessToken } from '@shared/lib/tokenService';

const mockGetCurrentUser = vi.fn();
vi.mock('@shared/api/auth.service', () => ({
  authService: {
    getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  },
}));

vi.mock('../../App', () => ({
  default: () => <div data-testid="app">App Content</div>,
}));

vi.mock('@app/store/hooks', async () => {
  const actual = await vi.importActual('@app/store/hooks');
  return {
    ...actual,
    useAppSelector: vi.fn(),
    useAppDispatch: vi.fn(),
  };
});

import { useAppSelector, useAppDispatch } from '@app/store/hooks';

const createStore = () => configureStore({
  reducer: { auth: authReducer },
});

describe('InitApp', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAppDispatch).mockReturnValue(mockDispatch);
  });

  it('renders App component', () => {
    vi.mocked(useAppSelector).mockReturnValue({ user: null });

    render(
      <Provider store={createStore()}>
        <InitApp />
      </Provider>
    );

    expect(screen.getByTestId('app')).toBeDefined();
  });

  it('calls getCurrentUser when token exists and no user', () => {
    vi.mocked(getAccessToken).mockReturnValue('test-token');
    vi.mocked(useAppSelector).mockReturnValue({ user: null });
    mockGetCurrentUser.mockResolvedValue({});

    render(
      <Provider store={createStore()}>
        <InitApp />
      </Provider>
    );

    expect(mockGetCurrentUser).toHaveBeenCalledOnce();
  });

  it('dispatches setCredentials on successful getCurrentUser', async () => {
    vi.mocked(getAccessToken).mockReturnValue('test-token');
    vi.mocked(useAppSelector).mockReturnValue({ user: null });
    const userData = { id: '1', email: 'test@test.com', full_name: 'Test' };
    mockGetCurrentUser.mockResolvedValueOnce(userData);

    render(
      <Provider store={createStore()}>
        <InitApp />
      </Provider>
    );

    await vi.waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'auth/setCredentials',
        payload: { user: userData, token: 'test-token' },
      });
    });
  });

  it('calls setAccessToken(null) on getCurrentUser failure', async () => {
    vi.mocked(getAccessToken).mockReturnValue('test-token');
    vi.mocked(useAppSelector).mockReturnValue({ user: null });
    mockGetCurrentUser.mockRejectedValueOnce(new Error('Unauthorized'));

    render(
      <Provider store={createStore()}>
        <InitApp />
      </Provider>
    );

    await vi.waitFor(() => {
      expect(setAccessToken).toHaveBeenCalledWith(null);
    });
  });

  it('does not call getCurrentUser when no token', () => {
    vi.mocked(getAccessToken).mockReturnValue(null);
    vi.mocked(useAppSelector).mockReturnValue({ user: null });

    render(
      <Provider store={createStore()}>
        <InitApp />
      </Provider>
    );

    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it('does not call getCurrentUser when user already loaded', () => {
    vi.mocked(getAccessToken).mockReturnValue('test-token');
    vi.mocked(useAppSelector).mockReturnValue({ user: { id: '1', email: 'test@test.com', full_name: 'Test' } });

    render(
      <Provider store={createStore()}>
        <InitApp />
      </Provider>
    );

    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it('does not call getCurrentUser when token exists but app unmounts', () => {
    vi.mocked(getAccessToken).mockReturnValue('test-token');
    vi.mocked(useAppSelector).mockReturnValue({ user: null });
    mockGetCurrentUser.mockResolvedValue({});

    const { unmount } = render(
      <Provider store={createStore()}>
        <InitApp />
      </Provider>
    );

    unmount();
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
  });
});
