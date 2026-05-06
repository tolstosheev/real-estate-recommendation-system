export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string | null;
  telegram_handle?: string | null;
}

export interface UserPreferenceBase {
  min_price?: number;
  max_price?: number;
  min_area?: number;
  preferred_rooms?: number[];
  district?: string;
  metro?: string;
  material?: string;
  repair_type?: string;
  min_build_year?: number;
  max_build_year?: number;
}

export type UserPreferenceCreate = UserPreferenceBase;

export interface UserPreferenceOut extends UserPreferenceBase {
  user_id: string;
}
