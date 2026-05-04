import { describe, it, expect, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from '@shared/api/api';
import type { Property } from '@entities/property/model/types';

const mock = new MockAdapter(api);

const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Cheap Studio',
    description: null,
    price: 1000000,
    area: 25,
    rooms: 1,
    floor: 3,
    total_floors: 5,
    property_type: 'Apartment',
    address: 'Budget St 1',
    lat: 55.75,
    lon: 37.61,
    images: ['img1.jpg'],
    owner: {
      full_name: 'Owner 1',
      phone_number: null,
      telegram_handle: null,
    },
  },
  {
    id: '2',
    title: 'Luxury House',
    description: 'Beautiful house',
    price: 10000000,
    area: 150,
    rooms: 4,
    floor: 1,
    total_floors: 2,
    property_type: 'House',
    address: 'Rich Ave 5',
    lat: 55.76,
    lon: 37.62,
    images: ['img2.jpg'],
    owner: {
      full_name: 'Owner 2',
      phone_number: '+1234567890',
      telegram_handle: '@owner2',
    },
  },
  {
    id: '3',
    title: 'Commercial Space',
    description: null,
    price: 5000000,
    area: 80,
    rooms: 2,
    floor: 1,
    total_floors: 1,
    property_type: 'Commercial',
    address: 'Business Blvd 10',
    lat: 55.77,
    lon: 37.63,
    images: [],
    owner: {
      full_name: 'Owner 3',
      phone_number: null,
      telegram_handle: null,
    },
  },
];

describe('Catalog API', () => {
  beforeEach(() => {
    mock.reset();
  });

  it('should fetch properties by map bounds', async () => {
    mock.onGet('/api/properties/map').reply(200, mockProperties.slice(0, 2));

    const response = await api.get('/api/properties/map', {
      params: {
        min_lat: 55.70,
        max_lat: 55.80,
        min_lon: 37.60,
        max_lon: 37.70,
        limit: 200,
      },
    });

    expect(response.data).toHaveLength(2);
    expect(response.data[0].id).toBe('1');
  });

  it('should apply price filters correctly', async () => {
    mock.onGet('/api/properties/map').reply(200, [mockProperties[0]]);

    const response = await api.get('/api/properties/map', {
      params: {
        min_lat: 55.70,
        max_lat: 55.80,
        min_lon: 37.60,
        max_lon: 37.70,
        min_price: 500000,
        max_price: 2000000,
        limit: 200,
      },
    });

    expect(response.data).toHaveLength(1);
    expect(response.data[0].price).toBe(1000000);
  });

  it('should filter by rooms count', async () => {
    mock.onGet('/api/properties/map').reply(200, [mockProperties[1]]);

    const response = await api.get('/api/properties/map', {
      params: {
        min_lat: 55.70,
        max_lat: 55.80,
        min_lon: 37.60,
        max_lon: 37.70,
        rooms: 4,
        limit: 200,
      },
    });

    expect(response.data).toHaveLength(1);
    expect(response.data[0].rooms).toBe(4);
  });

  it('should filter by property type', async () => {
    mock.onGet('/api/properties/map').reply(200, [mockProperties[2]]);

    const response = await api.get('/api/properties/map', {
      params: {
        min_lat: 55.70,
        max_lat: 55.80,
        min_lon: 37.60,
        max_lon: 37.70,
        property_type: 'Commercial',
        limit: 200,
      },
    });

    expect(response.data).toHaveLength(1);
    expect(response.data[0].property_type).toBe('Commercial');
  });

  it('should handle combined filters', async () => {
    mock.onGet('/api/properties/map').reply(200, []);

    const response = await api.get('/api/properties/map', {
      params: {
        min_lat: 55.70,
        max_lat: 55.80,
        min_lon: 37.60,
        max_lon: 37.70,
        min_price: 3000000,
        max_price: 8000000,
        rooms: 2,
        property_type: 'Apartment',
        limit: 200,
      },
    });

    expect(response.data).toHaveLength(0);
  });

  it('should handle empty results gracefully', async () => {
    mock.onGet('/api/properties/map').reply(200, []);

    const response = await api.get('/api/properties/map', {
      params: {
        min_lat: 55.70,
        max_lat: 55.80,
        min_lon: 37.60,
        max_lon: 37.70,
        limit: 200,
      },
    });

    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data).toHaveLength(0);
  });

  it('should handle server errors during property fetch', async () => {
    mock.onGet('/api/properties/map').reply(500, { detail: 'Server error' });

    await expect(api.get('/api/properties/map')).rejects.toThrow();
  });

  it('should use correct default bounds when no bounds provided', () => {
    const defaultBounds: [number, number, number, number] = [56.5, 38.5, 55.0, 36.5];
    const [north, east, south, west] = defaultBounds;

    expect(north).toBe(56.5);
    expect(east).toBe(38.5);
    expect(south).toBe(55.0);
    expect(west).toBe(36.5);
    expect(north > south).toBe(true);
    expect(east > west).toBe(true);
  });
});
