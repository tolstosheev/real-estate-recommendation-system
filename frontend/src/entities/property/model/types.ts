export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  area: number;
  rooms: number;
  floor: number;
  total_floors: number;
  address: string;
  coordinates: [number, number];
  photos: string[];
  ai_relevance: number;
  created_at: string;
}

export interface PropertyRecommendation {
  property: Property;
  reason: string;
  score: number;
}
