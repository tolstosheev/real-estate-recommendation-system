const YANDEX_GEOCODER_URL = 'https://geocode-maps.yandex.ru/v1/';
const API_KEY = import.meta.env.VITE_YANDEX_GEOCODER_API_KEY || import.meta.env.VITE_YANDEX_MAPS_API_KEY;

export interface GeocoderResult {
  lat: number;
  lon: number;
  address: string;
  formattedAddress: string;
  district: string | null;
  metro: string | null;
}

export const geocodeAddress = async (address: string): Promise<GeocoderResult | null> => {
  if (!address || address.trim().length < 3) return null;

  const params = new URLSearchParams({
    apikey: API_KEY || '',
    format: 'json',
    geocode: address,
    results: '10',
    lang: 'en_US',
  });

  try {
    const response = await fetch(`${YANDEX_GEOCODER_URL}?${params}`);
    const data = await response.json();

    const geoObject = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    if (!geoObject) return null;

    const [lon, lat] = geoObject.Point.pos.split(' ').map(Number);
    const formattedAddress = geoObject.metaDataProperty?.GeocoderMetaData?.text || address;

    const components = geoObject.metaDataProperty?.GeocoderMetaData?.Address?.Components || [];

    let district: string | null = null;
    let metro: string | null = null;
    let area: string | null = null;
    for (const c of components) {
      if (c.kind === 'district') district = c.name;
      if (c.kind === 'metro') metro = c.name;
      if (c.kind === 'area') area = c.name;
    }
    if (!district) district = area;

    return {
      lat,
      lon,
      address,
      formattedAddress,
      district,
      metro,
    };
  } catch (error) {
    console.error('Geocoder error:', error);
    return null;
  }
};

export const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
  const params = new URLSearchParams({
    apikey: API_KEY || '',
    format: 'json',
    geocode: `${lon},${lat}`,
    results: '1',
  });

  try {
    const response = await fetch(`${YANDEX_GEOCODER_URL}?${params}`);
    const data = await response.json();

    const geoObject = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    if (!geoObject) return null;

    return geoObject.metaDataProperty?.GeocoderMetaData?.text || null;
  } catch (error) {
    console.error('Reverse geocoder error:', error);
    return null;
  }
};
