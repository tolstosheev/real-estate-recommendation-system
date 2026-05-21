export interface FilterValues {
  priceRange: [number, number];
  areaRange: [number, number];
  buildYearRange: [number, number];
  rooms: number[];
  propertyTypes: string[];
  propertyPurposes: string[];
  cities: string[];
  materials: string[];
  repairTypes: string[];
  isNew: string[];
}

function numParam(params: URLSearchParams, key: string, fallback: number): number {
  const v = params.get(key);
  if (v === null) return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

export function parseFilters(params: URLSearchParams, defaults: FilterValues): FilterValues {
  return {
    priceRange: [
      numParam(params, 'min_price', defaults.priceRange[0]),
      numParam(params, 'max_price', defaults.priceRange[1]),
    ],
    areaRange: [
      numParam(params, 'min_area', defaults.areaRange[0]),
      numParam(params, 'max_area', defaults.areaRange[1]),
    ],
    buildYearRange: [
      numParam(params, 'min_year', defaults.buildYearRange[0]),
      numParam(params, 'max_year', defaults.buildYearRange[1]),
    ],
    rooms: params.getAll('rooms').map(Number).filter(n => !isNaN(n)),
    propertyTypes: params.getAll('property_type'),
    propertyPurposes: params.getAll('purpose'),
    cities: params.getAll('city'),
    materials: params.getAll('material'),
    repairTypes: params.getAll('repair_type'),
    isNew: params.getAll('building_type'),
  };
}

export function parseSearch(params: URLSearchParams): string {
  return params.get('search') || '';
}

export function filtersToSearchParams(filters: FilterValues, search: string, defaults: FilterValues): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.priceRange[0] !== defaults.priceRange[0]) params.set('min_price', String(filters.priceRange[0]));
  if (filters.priceRange[1] !== defaults.priceRange[1]) params.set('max_price', String(filters.priceRange[1]));
  if (filters.areaRange[0] !== defaults.areaRange[0]) params.set('min_area', String(filters.areaRange[0]));
  if (filters.areaRange[1] !== defaults.areaRange[1]) params.set('max_area', String(filters.areaRange[1]));
  if (filters.buildYearRange[0] !== defaults.buildYearRange[0]) params.set('min_year', String(filters.buildYearRange[0]));
  if (filters.buildYearRange[1] !== defaults.buildYearRange[1]) params.set('max_year', String(filters.buildYearRange[1]));

  for (const v of filters.rooms) params.append('rooms', String(v));
  for (const v of filters.propertyTypes) params.append('property_type', v);
  for (const v of filters.propertyPurposes) params.append('purpose', v);
  for (const v of filters.cities) params.append('city', v);
  for (const v of filters.materials) params.append('material', v);
  for (const v of filters.repairTypes) params.append('repair_type', v);
  for (const v of filters.isNew) params.append('building_type', v);

  if (search) params.set('search', search);

  return params;
}
