import React, { useEffect, useState } from 'react';
import { getYmapsComponents } from '@shared/api/ymaps3';

interface MapMarkerProps {
  coordinates: [number, number];
  isSelected?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}

const


    YMapMarker: React.FC<MapMarkerProps> = ({ coordinates, isSelected, children, onClick }) => {
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

  const reactiveCoords = reactify.useDefault(coordinates, [coordinates[0], coordinates[1]]);

  return (
    <YMapMarkerComponent
      coordinates={reactiveCoords}
      onClick={onClick}
    >
      {isSelected ? (
        <div className="map-marker-label map-marker-label--selected">
          {children}
        </div>
      ) : (
        children
      )}
    </YMapMarkerComponent>
  );
};

export default YMapMarker;
