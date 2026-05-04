import React, { useEffect, useState } from 'react';
import { getYmapsComponents } from '@shared/api/ymaps3';

interface MapMarkerProps {
  coordinates: [number, number];
  children: React.ReactNode;
}

const YMapMarker: React.FC<MapMarkerProps> = ({ coordinates, children }) => {
  const [MarkerComponent, setMarkerComponent] = useState<React.ElementType | null>(null);

  useEffect(() => {
    let cancelled = false;

    getYmapsComponents()
      .then((components) => {
        if (!cancelled) {
          setMarkerComponent(() => components.YMapMarker);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  if (!MarkerComponent) return null;

  return <MarkerComponent coordinates={coordinates}>{children}</MarkerComponent>;
};

export default YMapMarker;
