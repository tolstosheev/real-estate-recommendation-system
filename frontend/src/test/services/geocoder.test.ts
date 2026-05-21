import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geocodeAddress, reverseGeocode } from '@shared/api/geocoder.service';

const YANDEX_GEOCODER_URL = 'https://geocode-maps.yandex.ru/v1/';

const mockFetchResponse = (data: unknown) => {
  return vi.mocked(fetch).mockResolvedValueOnce({
    json: () => Promise.resolve(data),
  } as Response);
};

const validGeoResponse = {
  response: {
    GeoObjectCollection: {
      featureMember: [
        {
          GeoObject: {
            Point: { pos: '37.6173 55.7558' },
            metaDataProperty: {
              GeocoderMetaData: {
                text: 'Moscow, Russia',
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
      mockFetchResponse(validGeoResponse);

      const result = await geocodeAddress('Moscow');

      expect(result).not.toBeNull();
      expect(result!.lat).toBe(55.7558);
      expect(result!.lon).toBe(37.6173);
      expect(result!.address).toBe('Moscow');
      expect(result!.formattedAddress).toBe('Moscow, Russia');
    });

    it('should return null for short address (< 3 chars)', async () => {
      const result = await geocodeAddress('ab');
      expect(result).toBeNull();
    });

    it('should return null for empty string', async () => {
      const result = await geocodeAddress('');
      expect(result).toBeNull();
    });

    it('should return null when no geo objects found', async () => {
      mockFetchResponse({
        response: {
          GeoObjectCollection: {
            featureMember: [],
          },
        },
      });

      const result = await geocodeAddress('UnknownPlace');
      expect(result).toBeNull();
    });

    it('should return null on fetch error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await geocodeAddress('Moscow');
      expect(result).toBeNull();
    });

    it('should call the correct Yandex API URL', async () => {
      mockFetchResponse(validGeoResponse);

      await geocodeAddress('Saint Petersburg');

      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain(YANDEX_GEOCODER_URL);
      expect(callUrl).toContain('geocode=Saint+Petersburg');
      expect(callUrl).toContain('format=json');
      expect(callUrl).toContain('results=1');
    });
  });

  describe('reverseGeocode', () => {
    it('should return formatted address on success', async () => {
      mockFetchResponse(validGeoResponse);

      const result = await reverseGeocode(55.7558, 37.6173);

      expect(result).toBe('Moscow, Russia');
    });

    it('should return null when no geo objects found', async () => {
      mockFetchResponse({
        response: {
          GeoObjectCollection: {
            featureMember: [],
          },
        },
      });

      const result = await reverseGeocode(55.7558, 37.6173);
      expect(result).toBeNull();
    });

    it('should return null on fetch error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await reverseGeocode(55.7558, 37.6173);
      expect(result).toBeNull();
    });

    it('should call the correct Yandex API URL with coordinates', async () => {
      mockFetchResponse(validGeoResponse);

      await reverseGeocode(55.7558, 37.6173);

      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain('geocode=37.6173%2C55.7558');
    });
  });
});
