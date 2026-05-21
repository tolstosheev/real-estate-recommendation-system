import type { FilterValues } from '@shared/utils/filterParams';

export const CATALOG_PAGE_SIZE = 12;

export const defaultFilters: FilterValues = {
  priceRange: [0, 50000000],
  areaRange: [0, 300],
  buildYearRange: [1960, 2025],
  rooms: [],
  propertyTypes: [],
  propertyPurposes: [],
  cities: [],
  materials: [],
  repairTypes: [],
  isNew: [],
};

export function buildParams(
  filters: FilterValues,
  search: string,
  pageNum: number,
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    limit: CATALOG_PAGE_SIZE,
    offset: (pageNum - 1) * CATALOG_PAGE_SIZE,
  };
  if (filters.priceRange[0] > 0) params.min_price = filters.priceRange[0];
  if (filters.priceRange[1] < 50000000) params.max_price = filters.priceRange[1];
  if (filters.areaRange[0] > 0) params.min_area = filters.areaRange[0];
  if (filters.areaRange[1] < 300) params.max_area = filters.areaRange[1];
  if (filters.buildYearRange[0] > 1960) params.min_build_year = filters.buildYearRange[0];
  if (filters.buildYearRange[1] < 2025) params.max_build_year = filters.buildYearRange[1];
  if (filters.rooms.length) params.rooms = filters.rooms;
  if (filters.propertyTypes.length) params.property_type = filters.propertyTypes;
  if (filters.propertyPurposes.length) params.property_purpose = filters.propertyPurposes;
  if (filters.cities.length) params.city = filters.cities;
  if (filters.materials.length) params.material = filters.materials;
  if (filters.repairTypes.length) params.repair_type = filters.repairTypes;
  if (filters.isNew.length) params.is_new = filters.isNew;
  if (search) params.search = search;
  return params;
}
