import React, { useState, useEffect } from 'react';
import { getYmapsComponents } from '@shared/api/ymaps3';

interface MapMarkerProps {
  coordinates: [number, number];
  children: React.ReactNode;
}

const YMapMarker: React.FC<MapMarkerProps> = ({ coordinates, children }) => {
  const [Marker, setMarker] = useState<any>(null);

  useEffect(() => {
    getYmapsComponents().then(components => {
      setMarker(() => components.YMapMarker);
    });
  }, []);

  if (!Marker) return null;

  return <Marker coordinates={coordinates}>{children}</Marker>;
};

export default YMapMarker;
