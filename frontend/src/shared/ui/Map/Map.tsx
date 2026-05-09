import React, { useEffect, useState, useCallback } from 'react';
import './Map.scss';
import { getYmapsComponents } from '@shared/api/ymaps3';

interface MapProps {
  center?: [number, number];
  zoom?: number;
  onBoundsChange?: (bounds: [number, number, number, number]) => void;
  onZoomChange?: (zoom: number) => void;
  children?: React.ReactNode;
}

type YMapsComponents = Awaited<ReturnType<typeof getYmapsComponents>>;

function extractLat(v: unknown): number | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.lat === 'number') return o.lat;
  if (typeof (o as any).getLat === 'function') return (o as any).getLat();
  return undefined;
}

function extractLon(v: unknown): number | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.lon === 'number') return o.lon;
  if (typeof o.lng === 'number') return o.lng;
  if (typeof o.longitude === 'number') return o.longitude;
  if (typeof (o as any).getLon === 'function') return (o as any).getLon();
  if (typeof (o as any).getLng === 'function') return (o as any).getLng();
  return undefined;
}

const YandexMap: React.FC<MapProps> = ({ center = [37.6173, 55.7558], zoom = 11, onBoundsChange, onZoomChange, children }) => {
  const [components, setComponents] = useState<YMapsComponents | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    getYmapsComponents()
      .then((comps) => {
        setComponents(comps);
      })
      .catch((err) => {
        console.warn('Yandex Maps failed to initialize:', err);
        setHasError(true);
      });
  }, []);

  const handleBounds = useCallback((raw: unknown) => {
    if (!onBoundsChange || !raw || typeof raw !== 'object') return;

    const o = raw as Record<string, unknown>;
    const tryNE = (obj: unknown): [number, number] | null => {
      const lat = extractLat(obj);
      const lon = extractLon(obj);
      return (lat != null && lon != null) ? [lat, lon] : null;
    };

    let ne: [number, number] | null = null;
    let sw: [number, number] | null = null;

    if ('northEast' in o && 'southWest' in o) {
      ne = tryNE(o.northEast);
      sw = tryNE(o.southWest);
    }

    if ((!ne || !sw) && typeof (o as any).getNorthEast === 'function') {
      ne = tryNE((o as any).getNorthEast());
      sw = tryNE((o as any).getSouthWest());
    }

    if (ne && sw) {
      onBoundsChange([ne[0], ne[1], sw[0], sw[1]]);
    }
  }, [onBoundsChange]);

  const handleUpdate = useCallback((update: { location?: { zoom?: number } }) => {
    if (onZoomChange && update.location?.zoom != null) {
      onZoomChange(update.location.zoom);
    }
  }, [onZoomChange]);

  if (hasError) {
    return (
      <div className="yandex-map yandex-map--error">
        <div className="yandex-map__error-content">
          <svg className="yandex-map__error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <p className="yandex-map__error-text">Map unavailable</p>
        </div>
      </div>
    );
  }

  if (!components) {
    return (
      <div className="yandex-map yandex-map--loading">
        <div className="yandex-map__loading-spinner" />
      </div>
    );
  }

  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapListener, reactify } = components;

  const location = reactify.useDefault({ center, zoom }, [center, zoom]);

  return (
    <YMap location={location} onBoundsChange={handleBounds}>
      <YMapDefaultSchemeLayer />
      <YMapDefaultFeaturesLayer />
      <YMapListener onUpdate={handleUpdate} />
      {children}
    </YMap>
  );
};

export default YandexMap;
