const YANDEX_GEOCODER_URL = 'https://geocode-maps.yandex.ru/v1/';
const API_BASE = '/api';

export interface GeocoderResult {
  lat: number;
  lon: number;
  address: string;
  formattedAddress: string;
  district: string | null;
  metro: string | null;
  city: string | null;
}

function getApiKey(): string {
  return import.meta.env.VITE_YANDEX_GEOCODER_API_KEY || import.meta.env.VITE_YANDEX_MAPS_API_KEY || '';
}

export const geocodeAddress = async (address: string): Promise<GeocoderResult[]> => {
  if (!address || address.trim().length < 3) return [];

  const apiKey = getApiKey();
  if (!apiKey) return [];

  const params = new URLSearchParams({
    apikey: apiKey,
    format: 'json',
    geocode: address,
    results: '10',
    lang: 'en_US',
  });

  try {
    const response = await fetch(`${YANDEX_GEOCODER_URL}?${params}`);
    if (!response.ok) return [];
    const data = await response.json();

    const members = data?.response?.GeoObjectCollection?.featureMember ?? [];
    const results: GeocoderResult[] = [];

    for (const member of members) {
      const geo = member.GeoObject;
      if (!geo) continue;

      const point = geo.Point?.pos ?? '';
      const coords = point.split(' ');
      if (coords.length < 2) continue;

      const lon = Number(coords[0]);
      const lat = Number(coords[1]);
      const meta = geo.metaDataProperty?.GeocoderMetaData;
      const formatted = meta?.text ?? '';
      const components = meta?.Address?.Components ?? [];

      let district: string | null = null;
      let metro: string | null = null;
      let area: string | null = null;
      let province: string | null = null;
      for (const c of components) {
        if (c.kind === 'district') district = c.name;
        else if (c.kind === 'metro') metro = c.name;
        else if (c.kind === 'area') area = c.name;
        else if (c.kind === 'province') province = c.name;
      }
      if (!district) district = area;

      const city = province ? province.split(/\s+/)[0] : null;

      results.push({
        lat,
        lon,
        address,
        formattedAddress: formatted || address,
        district,
        metro,
        city,
      });
    }

    return results;
  } catch (error) {
    console.error('Geocoder error:', error);
    return [];
  }
};

export const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
  try {
    const response = await fetch(`${API_BASE}/geocode/reverse?lat=${lat}&lon=${lon}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.address;
  } catch (error) {
    console.error('Reverse geocoder error:', error);
    return null;
  }
};
