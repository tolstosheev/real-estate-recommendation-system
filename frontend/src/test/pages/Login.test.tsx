import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import Login from '@pages/auth/login/Login';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockLogin = vi.fn();
const mockGetCurrentUser = vi.fn();
vi.mock('@shared/api/auth.service', () => ({
  authService: {
    login: (...args: unknown[]) => mockLogin(...args),
    getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  },
}));

const createStore = () => configureStore({
  reducer: { auth: authReducer },
});

const renderLogin = () => render(
  <Provider store={createStore()}>
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  </Provider>
);

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form', () => {
    renderLogin();
    expect(screen.getByText('Sign In')).toBeDefined();
    expect(screen.getByPlaceholderText('example@mail.com')).toBeDefined();
    expect(screen.getByPlaceholderText('********')).toBeDefined();
  });

  it('shows error on failed login', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { data: { detail: 'Invalid credentials' } },
    });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('example@mail.com'), { target: { value: 'bad@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('********'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeDefined();
    });
  });

  it('navigates to home on successful login', async () => {
    mockLogin.mockResolvedValueOnce({ access_token: 'token123', token_type: 'bearer' });
    mockGetCurrentUser.mockResolvedValueOnce({ id: '1', email: 'test@test.com', full_name: 'Test' });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('example@mail.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('********'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows loading state during submission', async () => {
    mockLogin.mockImplementationOnce(() => new Promise(() => {}));
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('example@mail.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('********'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByText('Sign In'));
    expect(screen.getByText('Signing in...')).toBeDefined();
  });

  it('has link to register page', () => {
    renderLogin();
    const link = screen.getByText('Register');
    expect(link.getAttribute('href')).toBe('/register');
  });

  it('shows generic error when no detail provided', async () => {
    mockLogin.mockRejectedValueOnce({ response: { data: {} } });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('example@mail.com'), { target: { value: 'x@y.com' } });
    fireEvent.change(screen.getByPlaceholderText('********'), { target: { value: 'pwd' } });
    fireEvent.click(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(screen.getByText('An error occurred')).toBeDefined();
    });
  });
});
