import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterPanel from '@widgets/FilterPanel/ui/FilterPanel';
import type { FilterValues } from '@shared/utils/filterParams';

const defaultMeta = {
  cities: ['Moscow', 'SPB'],
  materials: ['Brick', 'Panel'],
  repair_types: ['Cosmetic', 'Euro'],
  property_types: ['Apartment', 'House'],
};

const baseFilters: FilterValues = {
  priceRange: [0, 100000000],
  areaRange: [0, 400],
  buildYearRange: [1960, 2026],
  rooms: [],
  propertyTypes: [],
  propertyPurposes: [],
  cities: [],
  materials: [],
  repairTypes: [],
  isNew: [],
};

const renderPanel = (overrides?: Partial<{
  filters: Partial<FilterValues>;
  meta: typeof defaultMeta;
  showActions: boolean;
  onFilterChange: ReturnType<typeof vi.fn>;
  onApply: ReturnType<typeof vi.fn>;
  onReset: ReturnType<typeof vi.fn>;
}>) => {
  const onFilterChange = overrides?.onFilterChange ?? vi.fn();
  const onApply = overrides?.onApply ?? vi.fn();
  const onReset = overrides?.onReset ?? vi.fn();
  const showActions = overrides?.showActions ?? true;

  const filters: FilterValues = {
    ...baseFilters,
    ...overrides?.filters,
  };

  const meta = overrides?.meta ?? defaultMeta;

  render(
    <FilterPanel
      filters={filters}
      meta={meta}
      showActions={showActions}
      onFilterChange={onFilterChange}
      onApply={onApply}
      onReset={onReset}
    />
  );

  return { onFilterChange, onApply, onReset };
};

describe('FilterPanel', () => {
  it('renders all sections', () => {
    renderPanel();
    expect(screen.getByText('Main')).toBeDefined();
    expect(screen.getByText('Location')).toBeDefined();
    expect(screen.getByText('Details')).toBeDefined();
  });

  it('formats price label with ₽ suffix', () => {
    renderPanel({ filters: { priceRange: [1000000, 5000000] } });
    expect(screen.getByText('1.0M ₽')).toBeDefined();
    expect(screen.getByText('5.0M ₽')).toBeDefined();
  });

  it('calls onFilterChange when property type checkbox clicked', () => {
    const { onFilterChange } = renderPanel();
    fireEvent.click(screen.getByLabelText('Apartment'));
    expect(onFilterChange).toHaveBeenCalledWith('propertyTypes', ['Apartment']);
  });

  it('calls onFilterChange when purpose checkbox clicked', () => {
    const { onFilterChange } = renderPanel();
    fireEvent.click(screen.getByLabelText('Sale'));
    expect(onFilterChange).toHaveBeenCalledWith('propertyPurposes', ['sale']);
  });

  it('toggles location section', () => {
    renderPanel();
    expect(screen.getAllByText('▶').length).toBe(3);
    fireEvent.click(screen.getByText('Location'));
    expect(screen.getAllByText('▶').length).toBe(2);
    expect(screen.getByText('▼')).toBeDefined();
  });

  it('calls onFilterChange when city checkbox clicked', () => {
    const { onFilterChange } = renderPanel();
    fireEvent.click(screen.getByLabelText('Moscow'));
    expect(onFilterChange).toHaveBeenCalledWith('cities', ['Moscow']);
  });

  it('toggles details section', () => {
    renderPanel();
    const header = screen.getByText('Details');
    fireEvent.click(header);
    expect(screen.getByText('▼')).toBeDefined();
  });

  it('formats area label with m² suffix', () => {
    renderPanel({ filters: { areaRange: [0, 400] } });
    expect(screen.getByText('0 m²')).toBeDefined();
    expect(screen.getByText('400 m²')).toBeDefined();
  });

  it('calls onFilterChange when area slider changes', () => {
    const { onFilterChange } = renderPanel({ filters: { areaRange: [50, 200] } });
    const sliders = screen.getAllByRole('slider');
    const areaSliders = sliders.filter(s => s.getAttribute('max') === '400');
    fireEvent.change(areaSliders[0], { target: { value: '100' } });
    expect(onFilterChange).toHaveBeenCalledWith('areaRange', [100, 200]);
  });

  it('calls onApply when Apply Filters button clicked', () => {
    const { onApply } = renderPanel();
    fireEvent.click(screen.getByText('Apply Filters'));
    expect(onApply).toHaveBeenCalled();
  });

  it('calls onReset when Reset button clicked', () => {
    const { onReset } = renderPanel();
    fireEvent.click(screen.getByText('Reset'));
    expect(onReset).toHaveBeenCalled();
  });

  it('hides action buttons when showActions is false', () => {
    renderPanel({ showActions: false });
    expect(screen.queryByText('Apply Filters')).toBeNull();
    expect(screen.queryByText('Reset')).toBeNull();
  });
});
