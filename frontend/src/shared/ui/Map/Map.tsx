import React from 'react';
import { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer } from '@shared/api/ymaps3';
import './Map.scss';

interface MapProps {
  center?: [number, number];
  zoom?: number;
  onBoundsChange?: (bounds: [number, number, number, number]) => void;
  children?: React.ReactNode;
}

const YandexMap: React.FC<MapProps> = ({ center = [55.7558, 37.6173], zoom = 11, onBoundsChange, children }) => {
  return (
    <YMap 
      location={{ center, zoom }} 
      onBoundsChange={(bounds) => {
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
