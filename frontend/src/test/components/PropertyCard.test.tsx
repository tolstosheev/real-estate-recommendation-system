import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PropertyCard from '@entities/property/ui/PropertyCard';
import type { Property } from '@entities/property/model/types';

const mockProperty: Property = {
  id: '1',
  title: 'Test Apartment',
  description: 'A nice test apartment',
  price: 5000000,
  area: 65,
  rooms: 2,
  floor: 5,
  total_floors: 12,
  property_type: 'Apartment',
  property_purpose: 'sale',
  category: '2-к квартира',
  address: 'Test Street 123',
  district: 'Центр',
  metro: 'Пушкинская',
  lat: 55.7558,
  lon: 37.6173,
  images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  sq_living: 40.5,
  sq_kitchen: 12.0,
  build_year: 2015,
  material: 'кирпич',
  repair_type: 'евро',
  room_type: 'изолированные',
  is_new: 'новостройка',
  balcony: 'есть',
  parking: 'есть',
  owner: {
    id: 'owner-1',
    full_name: 'Test Owner',
    phone_number: '+1234567890',
    telegram_handle: '@testowner',
  },
  views_count: 0,
  likes_count: 0,
};

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('PropertyCard', () => {
  it('should render property details correctly', () => {
    renderWithRouter(<PropertyCard property={mockProperty} />);
    
    expect(screen.getByText('Test Street 123')).toBeDefined();
    expect(screen.getByText('2 rooms')).toBeDefined();
    expect(screen.getByText('65 m²')).toBeDefined();
    expect(screen.getByText('5/12 fl.')).toBeDefined();
    expect(screen.getByText('Details')).toBeDefined();
  });

  it('should display placeholder when no images provided', () => {
    const propertyWithoutImages = { ...mockProperty, images: [] };
    renderWithRouter(<PropertyCard property={propertyWithoutImages} />);
    
    const img = screen.getByAltText('Test Apartment');
    expect(img.getAttribute('src')).toContain('svg');
    expect(img.getAttribute('src')).toContain('No Photo');
  });

  it('should display placeholder when images array contains empty strings', () => {
    const propertyWithEmptyImages = { ...mockProperty, images: ['', ''] };
    renderWithRouter(<PropertyCard property={propertyWithEmptyImages} />);
    
    const img = screen.getByAltText('Test Apartment');
    expect(img.getAttribute('src')).toContain('svg');
  });

  it('should show first valid image when some are empty', () => {
    const propertyWithMixedImages = { ...mockProperty, images: ['', 'https://example.com/valid.jpg', ''] };
    renderWithRouter(<PropertyCard property={propertyWithMixedImages} />);
    
    const img = screen.getByAltText('Test Apartment');
    expect(img.getAttribute('src')).toBe('https://example.com/valid.jpg');
  });

  it('should fallback to placeholder when image fails to load', () => {
    renderWithRouter(<PropertyCard property={mockProperty} />);
    
    const img = screen.getByAltText('Test Apartment');
    fireEvent.error(img);
    
    expect(img.getAttribute('src')).toContain('svg');
    expect(img.getAttribute('src')).toContain('No Photo');
  });

  it('should render with horizontal variant', () => {
    renderWithRouter(<PropertyCard property={mockProperty} variant="horizontal" />);
    
    const card = screen.getByText('Test Street 123').closest('.property-card');
    expect(card?.classList.contains('property-card--horizontal')).toBe(true);
  });

  it('should render with vertical variant by default', () => {
    renderWithRouter(<PropertyCard property={mockProperty} />);
    
    const card = screen.getByText('Test Street 123').closest('.property-card');
    expect(card?.classList.contains('property-card--vertical')).toBe(true);
  });

  it('should handle missing optional fields gracefully', () => {
    const minimalProperty: Property = {
      id: '2',
      title: 'Minimal Property',
      description: null,
      price: 3000000,
      area: null,
      rooms: null,
      floor: null,
      total_floors: null,
      property_type: null,
      property_purpose: null,
      category: null,
      address: 'Unknown Address',
      district: null,
      metro: null,
      lat: 55.7558,
      lon: 37.6173,
      images: ['https://example.com/photo.jpg'],
      sq_living: null,
      sq_kitchen: null,
      build_year: null,
      material: null,
      repair_type: null,
      room_type: null,
      is_new: null,
      balcony: null,
      parking: null,
      owner: {
        id: 'owner-unknown',
        full_name: 'Unknown',
        phone_number: null,
        telegram_handle: null,
      },
      views_count: 0,
      likes_count: 0,
    };

    renderWithRouter(<PropertyCard property={minimalProperty} />);
    
    expect(screen.getByText('Unknown Address')).toBeDefined();
    expect(screen.queryByText('rooms')).toBeNull();
    expect(screen.queryByText('m²')).toBeNull();
    expect(screen.queryByText('fl.')).toBeNull();
  });
});
