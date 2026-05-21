import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from '@shared/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>Card content</p></Card>);
    expect(screen.getByText('Card content')).toBeDefined();
  });

  it('applies custom className', () => {
    render(<Card className="custom-card"><span>test</span></Card>);
    const card = screen.getByText('test').closest('.card');
    expect(card?.classList.contains('custom-card')).toBe(true);
  });
});
