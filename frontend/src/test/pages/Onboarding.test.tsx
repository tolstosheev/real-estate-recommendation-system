import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import Onboarding from '@pages/onboarding/Onboarding';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const createStore = (isAuthenticated = false) => configureStore({
  reducer: { auth: authReducer },
  preloadedState: {
    auth: { user: null, token: null, isAuthenticated },
  },
});

const renderOnboarding = (store = createStore(false)) => render(
  <Provider store={store}>
    <BrowserRouter>
      <Onboarding />
    </BrowserRouter>
  </Provider>
);

describe('Onboarding Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the first onboarding step', () => {
    renderOnboarding();
    expect(screen.getByText('Welcome to nestAI')).toBeDefined();
    expect(screen.getByText('Skip')).toBeDefined();
    expect(screen.getByText('Next')).toBeDefined();
  });

  it('disables Back button on first step', () => {
    renderOnboarding();
    expect(screen.getByText('Back')).toBeDisabled();
  });

  it('navigates to next step on Next click', () => {
    renderOnboarding();
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('AI-Powered Discovery')).toBeDefined();
  });

  it('shows Get Started on last step', () => {
    renderOnboarding();
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText('Next'));
    }
    expect(screen.getByText('Get Started')).toBeDefined();
  });

  it('navigates to register on Get Started click', () => {
    renderOnboarding();
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText('Next'));
    }
    fireEvent.click(screen.getByText('Get Started'));
    expect(mockNavigate).toHaveBeenCalledWith('/register');
  });

  it('navigates to login on Skip click', () => {
    renderOnboarding();
    fireEvent.click(screen.getByText('Skip'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('redirects to home if already authenticated', () => {
    renderOnboarding(createStore(true));
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('goes back to previous step on Back click', () => {
    renderOnboarding();
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('AI-Powered Discovery')).toBeDefined();
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Welcome to nestAI')).toBeDefined();
  });

  it('shows progress indicator', () => {
    renderOnboarding();
    expect(screen.getByText('1 / 5')).toBeDefined();
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('2 / 5')).toBeDefined();
  });
});
