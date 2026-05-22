export const PROPERTY_TYPES = ['Apartment', 'Studio', 'House', 'Townhouse'];

export const PROPERTY_PURPOSES = [
  { value: 'sale', label: 'Sale' },
  { value: 'rent', label: 'Rent' },
  { value: 'daily_rent', label: 'Daily Rent' },
];

export const MATERIALS = ['Panel', 'Brick', 'Monolith', 'Brick-Monolith', 'Wood', 'Block'];

export const REPAIR_TYPES = ['Cosmetic', 'Euro', 'Design', 'Rough'];

export const ROOM_TYPES = ['Adjacent', 'Separated', 'Both'];

export const NEW_BUILDING_OPTIONS = [
  { value: 'new', label: 'New Building' },
  { value: 'secondary', label: 'Secondary' },
];

export const BALCONY_OPTIONS = [
  { value: 'yes', label: 'Has Balcony' },
  { value: 'no', label: 'No Balcony' },
];

export const PARKING_OPTIONS = [
  { value: 'yes', label: 'Has Parking' },
  { value: 'no', label: 'No Parking' },
  { value: 'paid', label: 'Paid Parking' },
];

export interface PropertyFormValues {
  title: string;
  description: string;
  price: string;
  rooms: string;
  area: string;
  floor: string;
  total_floors: string;
  property_type: string;
  property_purpose: string;
  category: string;
  address: string;
  district: string;
  metro: string;
  city: string;
  lat: string;
  lon: string;
  images: string[];
  sq_living: string;
  sq_kitchen: string;
  build_year: string;
  material: string;
  repair_type: string;
  room_type: string;
  is_new: string;
  balcony: string;
  parking: string;
}

export const EMPTY_FORM: PropertyFormValues = {
  title: '',
  description: '',
  price: '',
  rooms: '',
  area: '',
  floor: '',
  total_floors: '',
  property_type: 'Apartment',
  property_purpose: 'sale',
  category: '',
  address: '',
  district: '',
  metro: '',
  city: '',
  lat: '',
  lon: '',
  images: [],
  sq_living: '',
  sq_kitchen: '',
  build_year: '',
  material: 'Brick',
  repair_type: 'Cosmetic',
  room_type: 'Separated',
  is_new: 'secondary',
  balcony: 'yes',
  parking: 'no',
};
