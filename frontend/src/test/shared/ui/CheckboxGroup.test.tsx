import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CheckboxGroup from '@shared/ui/CheckboxGroup';

const options = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c' },
];

describe('CheckboxGroup', () => {
  it('renders checkboxes from options', () => {
    render(<CheckboxGroup label="Filters" options={options} selected={[]} onChange={() => {}} />);
    expect(screen.getByText('Option A')).toBeDefined();
    expect(screen.getByText('Option B')).toBeDefined();
    expect(screen.getByText('Option C')).toBeDefined();
  });

  it('calls onChange when checkbox clicked', () => {
    const onChange = vi.fn();
    render(<CheckboxGroup label="Filters" options={options} selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Option A'));
    expect(onChange).toHaveBeenCalledWith(['a']);
  });

  it('checks default values', () => {
    render(<CheckboxGroup label="Filters" options={options} selected={['a', 'c']} onChange={() => {}} />);
    expect((screen.getByLabelText('Option A') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Option B') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Option C') as HTMLInputElement).checked).toBe(true);
  });

  it('deselects item when already selected checkbox is clicked', () => {
    const onChange = vi.fn();
    render(<CheckboxGroup label="Filters" options={options} selected={['a', 'b']} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Option A'));
    expect(onChange).toHaveBeenCalledWith(['b']);
  });
});
