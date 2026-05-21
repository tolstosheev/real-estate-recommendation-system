import React from 'react';
import YMapMarker from '@shared/ui/Map/YMapMarker';

interface ClusterItemProps {
  coordinates: [number, number];
  count: number;
  onClusterZoom: (coords: [number, number]) => void;
}

const ClusterItem = React.memo(function ClusterItem({
  coordinates, count, onClusterZoom,
}: ClusterItemProps) {
  return (
    <YMapMarker
      coordinates={coordinates}
      onClick={() => onClusterZoom(coordinates)}
    >
      <div className="map-cluster">{count}</div>
    </YMapMarker>
  );
}, (prev, next) => {
  return prev.count === next.count
    && prev.coordinates[0] === next.coordinates[0]
    && prev.coordinates[1] === next.coordinates[1]
    && prev.onClusterZoom === next.onClusterZoom;
});

export default ClusterItem;
