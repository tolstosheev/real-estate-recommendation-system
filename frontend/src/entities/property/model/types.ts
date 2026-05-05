export interface Property {
  id: string;
  title: string;
  description: string | null;
  price: number;
  area: number | null;
  rooms: number | null;
  floor: number | null;
  total_floors: number | null;
  property_type: string | null;
  address: string;
  lat: number;
  lon: number;
  images: string[];
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
