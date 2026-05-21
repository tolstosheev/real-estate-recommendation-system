import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import Register from '@pages/auth/register/Register';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockRegister = vi.fn();
const mockLogin = vi.fn();
vi.mock('@shared/api/auth.service', () => ({
  authService: {
    register: (...args: unknown[]) => mockRegister(...args),
    login: (...args: unknown[]) => mockLogin(...args),
  },
}));

const createStore = () => configureStore({
  reducer: { auth: authReducer },
});

const renderRegister = () => render(
  <Provider store={createStore()}>
    <BrowserRouter>
      <Register />
    </BrowserRouter>
  </Provider>
);

describe('Register Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders registration form', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeDefined();
    expect(screen.getByPlaceholderText('John Doe')).toBeDefined();
    expect(screen.getByPlaceholderText('example@mail.com')).toBeDefined();
    expect(screen.getByPlaceholderText('********')).toBeDefined();
  });

  it('shows error on failed registration', async () => {
    mockRegister.mockRejectedValueOnce({
      response: { data: { detail: 'Email already exists' } },
    });
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: 'User' } });
    fireEvent.change(screen.getByPlaceholderText('example@mail.com'), { target: { value: 'existing@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('********'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeDefined();
    });
  });

  it('navigates to home on successful registration', async () => {
    mockRegister.mockResolvedValueOnce({ id: '1', email: 'new@test.com', full_name: 'New' });
    mockLogin.mockResolvedValueOnce({ access_token: 'token123' });
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: 'New User' } });
    fireEvent.change(screen.getByPlaceholderText('example@mail.com'), { target: { value: 'new@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('********'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('has link to login page', () => {
    renderRegister();
    const link = screen.getByText('Sign In');
    expect(link.getAttribute('href')).toBe('/login');
  });
});
