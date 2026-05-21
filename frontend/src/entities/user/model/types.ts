export type { User } from '@shared/api/types';

export interface UserPreferenceBase {
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  preferred_rooms?: number[];
  property_types?: string[];
  property_purposes?: string[];
  cities?: string[];
  material?: string[];
  repair_type?: string[];
  min_build_year?: number;
  max_build_year?: number;
}

export type UserPreferenceCreate = UserPreferenceBase;

export interface UserPreferenceOut extends UserPreferenceBase {
  user_id: string;
}
