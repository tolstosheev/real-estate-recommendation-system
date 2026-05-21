import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '@shared/ui/Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeDefined();
  });

  it('renders with children', () => {
    render(<Button><span>Child Element</span></Button>);
    expect(screen.getByText('Child Element')).toBeDefined();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies className prop', () => {
    render(<Button className="custom-class">Styled</Button>);
    const btn = screen.getByRole('button');
    expect(btn.classList.contains('custom-class')).toBe(true);
  });
});
