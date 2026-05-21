import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from '@shared/ui/Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Username" />);
    expect(screen.getByText('Username')).toBeDefined();
  });

  it('shows error message', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeDefined();
  });

  it('calls onChange', () => {
    const onChange = vi.fn();
    render(<Input label="Name" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'John' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeDefined();
  });
});
