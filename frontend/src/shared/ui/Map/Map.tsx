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
  const [components, setComponents] = useState<Record<string, React.ElementType> | null>(null);

  useEffect(() => {
    getYmapsComponents().then(setComponents).catch(console.error);
  }, []);

  if (!components) {
    return <div className="yandex-map" style={{ height: '100%', width: '100%', background: '#eee' }} />;
  }

  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer } = components;

  return (
    <YMap 
      location={{ center, zoom }} 
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
