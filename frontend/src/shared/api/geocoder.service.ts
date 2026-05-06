const YANDEX_GEOCODER_URL = 'https://geocode-maps.yandex.ru/v1/';
const API_KEY = import.meta.env.VITE_YANDEX_GEOCODER_API_KEY || import.meta.env.VITE_YANDEX_MAPS_API_KEY;

export interface GeocoderResult {
  lat: number;
  lon: number;
  address: string;
  formattedAddress: string;
}

export const geocodeAddress = async (address: string): Promise<GeocoderResult | null> => {
  if (!address || address.trim().length < 3) return null;

  const params = new URLSearchParams({
    apikey: API_KEY || '',
    format: 'json',
    geocode: address,
    results: '1',
  });

  try {
    const response = await fetch(`${YANDEX_GEOCODER_URL}?${params}`);
    const data = await response.json();

    const geoObject = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    if (!geoObject) return null;

    const [lon, lat] = geoObject.Point.pos.split(' ').map(Number);
    const formattedAddress = geoObject.metaDataProperty?.GeocoderMetaData?.text || address;

    return {
      lat,
      lon,
      address,
      formattedAddress,
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
