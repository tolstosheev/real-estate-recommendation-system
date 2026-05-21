import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Chip from '@shared/ui/Chip';

describe('Chip', () => {
  it('renders label', () => {
    render(<Chip label="Test Chip" />);
    expect(screen.getByText('Test Chip')).toBeDefined();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Chip label="Clickable" onClick={onClick} />);
    fireEvent.click(screen.getByText('Clickable'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies active class when active is true', () => {
    render(<Chip label="Active Chip" active />);
    const chip = screen.getByText('Active Chip');
    expect(chip.classList.contains('chip--active')).toBe(true);
  });

  it('applies className prop', () => {
    render(<Chip label="Styled" className="custom-chip" />);
    const chip = screen.getByText('Styled');
    expect(chip.classList.contains('custom-chip')).toBe(true);
  });
});
