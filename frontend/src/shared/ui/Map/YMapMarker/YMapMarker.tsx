import React, { useEffect, useState } from 'react';
import { getYmapsComponents } from '@shared/api/ymaps3';

interface MapMarkerProps {
  coordinates: [number, number];
  children?: React.ReactNode;
}

const YMapMarker: React.FC<MapMarkerProps> = ({ coordinates, children }) => {
  const [YMapMarkerComponent, setYMapMarkerComponent] = useState<React.ElementType | null>(null);
  const [reactify, setReactify] = useState<{ useDefault: (value: unknown, deps?: unknown[]) => unknown } | null>(null);

  useEffect(() => {
    let cancelled = false;

    getYmapsComponents()
      .then(({ YMapMarker, reactify: rf }) => {
        if (!cancelled) {
          setYMapMarkerComponent(() => YMapMarker);
          setReactify(() => rf);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  if (!YMapMarkerComponent || !reactify) return null;

  return (
    <YMapMarkerComponent coordinates={reactify.useDefault(coordinates)}>
      {children}
    </YMapMarkerComponent>
  );
};

export default YMapMarker;
