import type { Property } from '@shared/api/types';

export const CLUSTER_MAX_ZOOM = 14;
export const CLUSTER_BASE_CELL = 200;
export const MAX_VISIBLE = 2000;

export interface ClusteredItem {
  coordinates: [number, number];
  count: number;
  property: Property | null;
}

export const isWithinBounds = (p: Property, bounds: [number, number, number, number]) => {
  const [north, east, south, west] = bounds;
  if (p.lat == null || p.lon == null) return false;
  return p.lat >= south && p.lat <= north && p.lon >= west && p.lon <= east;
};

export function clusterProperties(properties: Property[], zoom: number): ClusteredItem[] {
  if (zoom >= CLUSTER_MAX_ZOOM || !properties.length) {
    return properties.map(p => ({ coordinates: [p.lon, p.lat], count: 1, property: p }));
  }

  const cellSize = CLUSTER_BASE_CELL / Math.pow(2, zoom);
  const grid = new Map<string, { sumLat: number; sumLon: number; count: number; property: Property | null }>();

  for (const p of properties) {
    if (p.lat == null || p.lon == null) continue;
    const gx = Math.floor(p.lon / cellSize);
    const gy = Math.floor(p.lat / cellSize);
    const key = `${gx}:${gy}`;

    if (!grid.has(key)) {
      grid.set(key, { sumLat: p.lat, sumLon: p.lon, count: 1, property: p });
    } else {
      const c = grid.get(key)!;
      c.sumLat += p.lat;
      c.sumLon += p.lon;
      c.count++;
      c.property = null;
    }
  }

  return Array.from(grid.values()).map(c => ({
    coordinates: [c.sumLon / c.count, c.sumLat / c.count],
    count: c.count,
    property: c.property,
  }));
}
