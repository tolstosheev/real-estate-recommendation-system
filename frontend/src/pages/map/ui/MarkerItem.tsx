import React, { useCallback } from 'react';
import YMapMarker from '@shared/ui/Map/YMapMarker';

interface MarkerItemProps {
  coordinates: [number, number];
  isSelected: boolean;
  isZoomedOut: boolean;
  propertyId: string;
  price: number;
  address: string;
  onMarkerClick: (id: string) => void;
}

const MarkerItem = React.memo(function MarkerItem({
  coordinates, isSelected, isZoomedOut, propertyId, price, address, onMarkerClick,
}: MarkerItemProps) {
  const handleClick = useCallback(() => onMarkerClick(propertyId), [onMarkerClick, propertyId]);
  return (
    <YMapMarker
      coordinates={coordinates}
      onClick={handleClick}
      isSelected={isSelected}
    >
      {isZoomedOut && !isSelected ? (
        <div className="map-marker-pin" />
      ) : (
        <div className={`map-marker-label ${isSelected ? 'map-marker-label--selected' : ''}`}>
          <div className="map-marker-label__price">{price.toLocaleString()} ₽</div>
          <div className="map-marker-label__address">{address}</div>
        </div>
      )}
    </YMapMarker>
  );
}, (prev, next) => {
  return prev.propertyId === next.propertyId
    && prev.isSelected === next.isSelected
    && prev.isZoomedOut === next.isZoomedOut
    && prev.coordinates[0] === next.coordinates[0]
    && prev.coordinates[1] === next.coordinates[1]
    && prev.price === next.price
    && prev.address === next.address
    && prev.onMarkerClick === next.onMarkerClick;
});

export default MarkerItem;
