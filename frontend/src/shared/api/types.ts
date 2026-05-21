export interface Property {
  id: string;
  title: string;
  city: string | null;
  description: string | null;
  price: number;
  area: number | null;
  rooms: number | null;
  floor: number | null;
  total_floors: number | null;
  property_type: string | null;
  property_purpose: string | null;
  category: string | null;
  address: string;
  district: string | null;
  metro: string | null;
  lat: number;
  lon: number;
  images: string[];
  sq_living: number | null;
  sq_kitchen: number | null;
  build_year: number | null;
  material: string | null;
  repair_type: string | null;
  room_type: string | null;
  is_new: string | null;
  balcony: string | null;
  parking: string | null;
  owner: PropertyOwner;
  views_count: number;
  likes_count: number;
  is_liked_by_me?: boolean;
  is_ai_recommendation?: boolean;
}

export interface PropertyOwner {
  id: string;
  full_name: string;
  phone_number: string | null;
  telegram_handle: string | null;
}

export type PropertyRecommendation = Property;

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  telegram_handle: string | null;
}

export interface UserPreferenceCreate {
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  preferred_rooms?: number[];
  property_types?: string[];
  property_purposes?: string[];
  cities?: string[];
  tags?: string[];
  material?: string[];
  repair_type?: string[];
  min_build_year?: number;
  max_build_year?: number;
}

export interface UserPreferenceOut extends UserPreferenceCreate {
  user_id: string;
}
