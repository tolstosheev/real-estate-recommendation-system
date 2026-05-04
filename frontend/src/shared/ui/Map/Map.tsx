import React, { useEffect, useState } from 'react';
import './Map.scss';
import { getYmapsComponents } from '@shared/api/ymaps3';

interface YMapBounds {
  northEast: { lat: number; lon: number };
  southWest: { lat: number; lon: number };
}

interface MapProps {
  center?: [number, number];
  zoom?: number;
  onBoundsChange?: (bounds: [number, number, number, number]) => void;
  children?: React.ReactNode;
}

const YandexMap: React.FC<MapProps> = ({ center = [55.7558, 37.6173], zoom = 11, onBoundsChange, children }) => {
  const [components, setComponents] = useState<ReturnType<typeof getYmapsComponents> extends Promise<infer T> ? T : never | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    getYmapsComponents()
      .then(setComponents)
      .catch((err) => {
        console.warn('Yandex Maps failed to initialize:', err);
        setHasError(true);
      });
  }, []);

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

  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, reactify } = components;

  return (
    <YMap
      location={reactify.useDefault({ center, zoom })}
      onBoundsChange={(bounds: YMapBounds) => {
        if (onBoundsChange) {
          onBoundsChange([
            bounds.northEast.lat,
            bounds.northEast.lon,
            bounds.southWest.lat,
            bounds.southWest.lon,
          ]);
        }
      }}
    >
      <YMapDefaultSchemeLayer />
      <YMapDefaultFeaturesLayer />
      {children}
    </YMap>
  );
};

export default YandexMap;
