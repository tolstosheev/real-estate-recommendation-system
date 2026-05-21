import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '@shared/components/ProtectedRoute';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  };
});

describe('ProtectedRoute', () => {
  it('renders Outlet when authenticated', () => {
    render(
      <MemoryRouter>
        <ProtectedRoute isAuthenticated={true} />
      </MemoryRouter>
    );

    expect(screen.getByTestId('outlet')).toBeDefined();
    expect(screen.queryByTestId('navigate')).toBeNull();
  });

  it('redirects to /login when not authenticated', () => {
    render(
      <MemoryRouter>
        <ProtectedRoute isAuthenticated={false} />
      </MemoryRouter>
    );

    const navigate = screen.getByTestId('navigate');
    expect(navigate).toBeDefined();
    expect(navigate.getAttribute('data-to')).toBe('/login');
  });

  it('redirects to custom path when not authenticated and redirectTo provided', () => {
    render(
      <MemoryRouter>
        <ProtectedRoute isAuthenticated={false} redirectTo="/onboarding" />
      </MemoryRouter>
    );

    const navigate = screen.getByTestId('navigate');
    expect(navigate).toBeDefined();
    expect(navigate.getAttribute('data-to')).toBe('/onboarding');
  });
});
