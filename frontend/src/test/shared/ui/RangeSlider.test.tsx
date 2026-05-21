import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RangeSlider from '@shared/ui/RangeSlider';

describe('RangeSlider', () => {
  it('renders with min/max values', () => {
    render(
      <RangeSlider
        label="Price"
        min={0}
        max={1000}
        step={10}
        value={[100, 500]}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Price')).toBeDefined();
    expect(screen.getByText('100')).toBeDefined();
    expect(screen.getByText('500')).toBeDefined();
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(
      <RangeSlider
        label="Price"
        min={0}
        max={1000}
        step={10}
        value={[100, 500]}
        onChange={onChange}
      />
    );
    const inputs = screen.getAllByRole('slider');
    expect(inputs).toHaveLength(2);
    fireEvent.change(inputs[0], { target: { value: '200' } });
    expect(onChange).toHaveBeenCalledWith([200, 500]);
  });

  it('calls onChange when max slider changes', () => {
    const onChange = vi.fn();
    render(
      <RangeSlider
        label="Price"
        min={0}
        max={1000}
        step={10}
        value={[100, 500]}
        onChange={onChange}
      />
    );
    const inputs = screen.getAllByRole('slider');
    fireEvent.change(inputs[1], { target: { value: '700' } });
    expect(onChange).toHaveBeenCalledWith([100, 700]);
  });

  it('uses formatLabel when provided', () => {
    render(
      <RangeSlider
        label="Price"
        min={0}
        max={1000}
        step={10}
        value={[100, 500]}
        onChange={() => {}}
        formatLabel={(v) => `$${v}`}
      />
    );
    expect(screen.getByText('$100')).toBeDefined();
    expect(screen.getByText('$500')).toBeDefined();
  });
});
