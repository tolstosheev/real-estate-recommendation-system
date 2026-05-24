import { describe, it, expect } from 'vitest';
import { parseFilters, parseSearch, filtersToSearchParams } from '@shared/utils/filterParams';

const defaults = {
  priceRange: [0, 100000000] as [number, number],
  areaRange: [0, 400] as [number, number],
  buildYearRange: [1960, 2026] as [number, number],
  rooms: [],
  propertyTypes: [],
  propertyPurposes: [],
  cities: [],
  materials: [],
  repairTypes: [],
  isNew: [],
};

describe('parseFilters', () => {
  it('parses numeric params with NaN fallback', () => {
    const params = new URLSearchParams('min_price=invalid&max_price=100000000');
    const result = parseFilters(params, defaults);
    expect(result.priceRange[0]).toBe(defaults.priceRange[0]);
    expect(result.priceRange[1]).toBe(100000000);
  });

  it('parses empty params returning defaults', () => {
    const params = new URLSearchParams('');
    const result = parseFilters(params, defaults);
    expect(result.priceRange).toEqual([0, 100000000]);
    expect(result.rooms).toEqual([]);
  });

  it('parses multi-value params', () => {
    const params = new URLSearchParams('city=Moscow&city=SPB&rooms=1&rooms=2');
    const result = parseFilters(params, defaults);
    expect(result.cities).toEqual(['Moscow', 'SPB']);
    expect(result.rooms).toEqual([1, 2]);
  });
});

describe('parseSearch', () => {
  it('returns search string when present', () => {
    const params = new URLSearchParams('search=apartment');
    expect(parseSearch(params)).toBe('apartment');
  });

  it('returns empty string when no search', () => {
    const params = new URLSearchParams('');
    expect(parseSearch(params)).toBe('');
  });
});

describe('filtersToSearchParams', () => {
  it('omits default values', () => {
    const params = filtersToSearchParams(defaults, '', defaults);
    expect(params.toString()).toBe('');
  });

  it('includes non-default area values', () => {
    const filters = { ...defaults, areaRange: [50, 200] as [number, number] };
    const params = filtersToSearchParams(filters, '', defaults);
    expect(params.get('min_area')).toBe('50');
    expect(params.get('max_area')).toBe('200');
  });

  it('includes search param', () => {
    const params = filtersToSearchParams(defaults, 'apartment', defaults);
    expect(params.get('search')).toBe('apartment');
  });

  it('includes rooms and property types', () => {
    const filters = { ...defaults, rooms: [1, 2], propertyTypes: ['apartment'] };
    const params = filtersToSearchParams(filters, '', defaults);
    expect(params.getAll('rooms')).toEqual(['1', '2']);
    expect(params.getAll('property_type')).toEqual(['apartment']);
  });
});
