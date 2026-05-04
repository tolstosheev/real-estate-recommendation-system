export interface User {
  id: string;
  email: string;
  full_name?: string;
}

export interface UserPreferenceBase {
  min_price?: number;
  max_price?: number;
  min_area?: number;
  preferred_rooms?: number[];
  tags?: string[];
  priority_weight?: Record<string, number>;
}

export type UserPreferenceCreate = UserPreferenceBase;

export interface UserPreferenceOut extends UserPreferenceBase {
  user_id: string;
}
