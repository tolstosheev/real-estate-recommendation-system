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
}

export interface PropertyOwner {
  full_name: string;
  phone_number: string | null;
  telegram_handle: string | null;
}

export type PropertyRecommendation = Property;
