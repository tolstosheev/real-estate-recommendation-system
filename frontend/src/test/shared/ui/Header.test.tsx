import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '@shared/ui/Header';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Header', () => {
  it('renders navigation links when not authenticated', () => {
    renderWithRouter(<Header isAuthenticated={false} user={null} onLogout={() => {}} />);
    expect(screen.getByText('Home')).toBeDefined();
    expect(screen.getByText('Map')).toBeDefined();
    expect(screen.getByText('Catalog')).toBeDefined();
    expect(screen.getByText('Sign In')).toBeDefined();
    expect(screen.getByText('Get Started')).toBeDefined();
  });

  it('renders profile link and logout when authenticated', () => {
    renderWithRouter(
      <Header isAuthenticated={true} user={{ full_name: 'John Doe' }} onLogout={() => {}} />
    );
    expect(screen.getByText('Profile')).toBeDefined();
    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('Logout')).toBeDefined();
  });

  it('does not show profile link when not authenticated', () => {
    renderWithRouter(<Header isAuthenticated={false} user={null} onLogout={() => {}} />);
    expect(screen.queryByText('Profile')).toBeNull();
    expect(screen.queryByText('Logout')).toBeNull();
  });

  it('calls onLogout when logout button clicked', () => {
    const onLogout = vi.fn();
    renderWithRouter(
      <Header isAuthenticated={true} user={{ full_name: 'Jane' }} onLogout={onLogout} />
    );
    fireEvent.click(screen.getByText('Logout'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('toggles mobile menu state and closes via nav link', () => {
    renderWithRouter(
      <Header isAuthenticated={true} user={{ full_name: 'John' }} onLogout={() => {}} />
    );
    const burger = screen.getByLabelText('Toggle menu');
    expect(screen.getByTestId('header-nav').classList.contains('header__nav--open')).toBe(false);
    fireEvent.click(burger);
    expect(screen.getByTestId('header-nav').classList.contains('header__nav--open')).toBe(true);
    fireEvent.click(screen.getByText('Home'));
    expect(screen.getByTestId('header-nav').classList.contains('header__nav--open')).toBe(false);
  });

  it('closes menu on logo click when open', () => {
    renderWithRouter(
      <Header isAuthenticated={true} user={{ full_name: 'John' }} onLogout={() => {}} />
    );
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    fireEvent.click(screen.getByRole('link', { name: /nest/i }));
    expect(screen.getByTestId('header-nav').classList.contains('header__nav--open')).toBe(false);
  });

  it('closes menu on logout when open', () => {
    const onLogout = vi.fn();
    renderWithRouter(
      <Header isAuthenticated={true} user={{ full_name: 'John' }} onLogout={onLogout} />
    );
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    fireEvent.click(screen.getByText('Logout'));
    expect(onLogout).toHaveBeenCalled();
    expect(screen.getByTestId('header-nav').classList.contains('header__nav--open')).toBe(false);
  });
});
