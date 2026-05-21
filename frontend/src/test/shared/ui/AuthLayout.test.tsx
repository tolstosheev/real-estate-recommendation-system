import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthLayout from '@shared/ui/AuthLayout';

describe('AuthLayout', () => {
  it('renders title and children', () => {
    render(
      <AuthLayout title="Sign In" footer={<span>Footer</span>}>
        <input placeholder="email" />
      </AuthLayout>
    );
    expect(screen.getByText('Sign In')).toBeDefined();
    expect(screen.getByPlaceholderText('email')).toBeDefined();
  });

  it('renders with different title', () => {
    render(
      <AuthLayout title="Register" footer={<span>Footer</span>}>
        <span>form</span>
      </AuthLayout>
    );
    expect(screen.getByText('Register')).toBeDefined();
  });
});
