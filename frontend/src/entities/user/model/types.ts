export interface User {
  id: string;
  email: string;
  full_name?: string;
}

export interface UserPreferenceOut {
  price_min?: number;
  price_max?: number;
  area_min?: number;
  area_max?: number;
  rooms_min?: number;
  rooms_max?: number;
}
