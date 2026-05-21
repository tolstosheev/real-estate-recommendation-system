import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geocodeAddress, reverseGeocode } from '@shared/api/geocoder.service';

const API_BASE = '/api';
const YANDEX_URL = 'https://geocode-maps.yandex.ru/v1/';

const mockFetchResponse = (data: unknown) => {
  return vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response);
};

const mockFetchError = (status: number) => {
  return vi.mocked(fetch).mockResolvedValueOnce({
    ok: false,
    status,
  } as Response);
};

const yandexApiResponse = {
  response: {
    GeoObjectCollection: {
      featureMember: [
        {
          GeoObject: {
            Point: { pos: '37.6173 55.7558' },
            metaDataProperty: {
              GeocoderMetaData: {
                text: 'Moscow, Russia',
                Address: { Components: [] },
              },
            },
          },
        },
      ],
    },
  },
};

describe('geocoderService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('geocodeAddress', () => {
    it('should return coordinates and address on success', async () => {
      mockFetchResponse(yandexApiResponse);

      const result = await geocodeAddress('Moscow');

      expect(result).toHaveLength(1);
      expect(result[0].lat).toBe(55.7558);
      expect(result[0].lon).toBe(37.6173);
      expect(result[0].address).toBe('Moscow');
      expect(result[0].formattedAddress).toBe('Moscow, Russia');
    });

    it('should return empty array for short address (< 3 chars)', async () => {
      const result = await geocodeAddress('ab');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', async () => {
      const result = await geocodeAddress('');
      expect(result).toEqual([]);
    });

    it('should return empty array when API returns 404', async () => {
      mockFetchError(404);

      const result = await geocodeAddress('UnknownPlace');
      expect(result).toEqual([]);
    });

    it('should return empty array on fetch error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await geocodeAddress('Moscow');
      expect(result).toEqual([]);
    });

    it('should call the Yandex Geocoder API URL directly', async () => {
      mockFetchResponse(yandexApiResponse);

      await geocodeAddress('Saint Petersburg');

      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain(YANDEX_URL);
      expect(callUrl).toContain('geocode=Saint+Petersburg');
      expect(callUrl).toContain('apikey=');
    });
  });

  describe('reverseGeocode', () => {
    it('should return formatted address on success', async () => {
      mockFetchResponse({ address: 'Moscow, Russia' });

      const result = await reverseGeocode(55.7558, 37.6173);

      expect(result).toBe('Moscow, Russia');
    });

    it('should return null when API returns 404', async () => {
      mockFetchError(404);

      const result = await reverseGeocode(55.7558, 37.6173);
      expect(result).toBeNull();
    });

    it('should return null on fetch error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await reverseGeocode(55.7558, 37.6173);
      expect(result).toBeNull();
    });

    it('should call the backend proxy API URL with coordinates', async () => {
      mockFetchResponse({ address: 'Moscow, Russia' });

      await reverseGeocode(55.7558, 37.6173);

      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain(`${API_BASE}/geocode/reverse`);
      expect(callUrl).toContain('lat=55.7558');
      expect(callUrl).toContain('lon=37.6173');
    });
  });
});
