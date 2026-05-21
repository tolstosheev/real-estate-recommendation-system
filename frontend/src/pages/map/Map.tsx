import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@app/store/hooks';
import YandexMap from '@shared/ui/Map';
import YMapMarker from '@shared/ui/Map/YMapMarker';
import PropertyCard from '@entities/property/ui/PropertyCard';
import Modal from '@shared/ui/Modal';
import type { Property } from '@shared/api/types';
import { propertyService } from '@shared/api/properties.service';
import { recommendationsService } from '@shared/api/recommendations.service';
import api from '@shared/api/api';
import RangeSlider from '@shared/ui/RangeSlider/RangeSlider';
import CheckboxGroup from '@shared/ui/CheckboxGroup/CheckboxGroup';
import './Map.scss';

interface MapFilters {
  priceRange: [number, number];
  areaRange: [number, number];
  buildYearRange: [number, number];
  rooms: number[];
  propertyTypes: string[];
  propertyPurposes: string[];
  cities: string[];
  materials: string[];
  repairTypes: string[];
  isNew: string[];
}

const defaultMapFilters: MapFilters = {
  priceRange: [0, 50000000],
  areaRange: [0, 300],
  buildYearRange: [1960, 2025],
  rooms: [],
  propertyTypes: [],
  propertyPurposes: [],
  cities: [],
  materials: [],
  repairTypes: [],
  isNew: [],
};

const MAP_PAGE_SIZE = 100;
const ALL_PROPERTIES_LIMIT = 10000;
const ZOOM_THRESHOLD = 13;

const isWithinBounds = (p: Property, bounds: [number, number, number, number]) => {
  const [north, east, south, west] = bounds;
  if (p.lat == null || p.lon == null) return false;
  return p.lat >= south && p.lat <= north && p.lon >= west && p.lon <= east;
};

const CLUSTER_MAX_ZOOM = 14;
const CLUSTER_BASE_CELL = 200;
const MAX_VISIBLE = 2000;

interface ClusteredItem {
  coordinates: [number, number];
  count: number;
  property: Property | null;
}

function clusterProperties(properties: Property[], zoom: number): ClusteredItem[] {
  if (zoom >= CLUSTER_MAX_ZOOM || !properties.length) {
    return properties.map(p => ({ coordinates: [p.lon, p.lat], count: 1, property: p }));
  }

  const cellSize = CLUSTER_BASE_CELL / Math.pow(2, zoom);
  const grid = new Map<string, { sumLat: number; sumLon: number; count: number; property: Property | null }>();

  for (const p of properties) {
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

interface ClusterItemProps {
  coordinates: [number, number];
  count: number;
  onClusterZoom: (coords: [number, number]) => void;
}

const ClusterItem = React.memo(function ClusterItem({
  coordinates, count, onClusterZoom,
}: ClusterItemProps) {
  const handleClick = useCallback(() => onClusterZoom(coordinates), [onClusterZoom, coordinates[0], coordinates[1]]);
  return (
    <YMapMarker
      coordinates={coordinates}
      onClick={handleClick}
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

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const handleMarkerClick = useCallback((propertyId: string) => {
    navigate(`/property/${propertyId}`);
  }, [navigate]);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.6173, 55.7558]);
  const [commandedZoom, setCommandedZoom] = useState(11);
  const [trackedZoom, setTrackedZoom] = useState(11);
  const [clusterZoom, setClusterZoom] = useState(11);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleClusterZoom = useCallback((coords: [number, number]) => {
    setMapCenter(coords);
    setCommandedZoom(trackedZoom + 2);
  }, [trackedZoom]);

  const handleCardClick = (propertyId: string) => {
    const prop = displayProperties.find(p => p.id === propertyId);
    if (prop) {
      setSelectedPropertyId(propertyId);
      setMapCenter([prop.lon, prop.lat]);
      setCommandedZoom(20);
    }
  };

  const isZoomedOut = trackedZoom < ZOOM_THRESHOLD;
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [currentBounds, setCurrentBounds] = useState<[number, number, number, number] | null>(null);
  const [aiRecs, setAiRecs] = useState<Property[]>([]);
  const [recVersion] = useState(0);
  const [meta, setMeta] = useState<{
    cities: string[];
    materials: string[];
    repair_types: string[];
    property_types: string[];
    city_centers: Record<string, [number, number]>;
  }>({
    cities: [], materials: [], repair_types: [], property_types: [], city_centers: {},
  });
  const [draftFilters, setDraftFilters] = useState<MapFilters>(defaultMapFilters);
  const [appliedFilters, setAppliedFilters] = useState<MapFilters>(defaultMapFilters);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const boundsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialFetch = useRef(false);
  const appliedFiltersRef = useRef(appliedFilters);
  appliedFiltersRef.current = appliedFilters;
  const suppressBoundsFetchRef = useRef(true);

  useEffect(() => {
    if (!hasInitialFetch.current) {
      hasInitialFetch.current = true;

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setMapCenter([position.coords.longitude, position.coords.latitude]);
            setCommandedZoom(12);
            setTrackedZoom(12);
          },
          () => {},
          { timeout: 5000, enableHighAccuracy: false }
        );
      }

      setCurrentBounds(null);
      fetchProperties(null, appliedFiltersRef.current);
    }
  }, []);

  useEffect(() => {
    propertyService.getMeta().then(data => {
      setMeta({
        cities: data.cities || [],
        materials: data.materials || [],
        repair_types: data.repair_types || [],
        property_types: data.property_types || [],
        city_centers: data.city_centers || {},
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      recommendationsService.getRecommendations().then(setAiRecs).catch(() => {});
    } else {
      setAiRecs([]);
    }
  }, [isAuthenticated, recVersion]);

  const clusterZoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (clusterZoomTimeoutRef.current) {
      clearTimeout(clusterZoomTimeoutRef.current);
    }
    clusterZoomTimeoutRef.current = setTimeout(() => {
      setClusterZoom(trackedZoom);
    }, 150);
  }, [trackedZoom]);

  const filteredAiRecs = useMemo(() => {
    if (!aiRecs.length) return [];
    return aiRecs.filter(p => {
      if (currentBounds && !isWithinBounds(p, currentBounds)) return false;
      const af = appliedFilters;
      if (af.cities.length && (!p.city || !af.cities.includes(p.city))) return false;
      if (af.propertyTypes.length && (!p.property_type || !af.propertyTypes.includes(p.property_type))) return false;
      if (af.propertyPurposes.length && (!p.property_purpose || !af.propertyPurposes.includes(p.property_purpose))) return false;
      if (af.isNew.length && (!p.is_new || !af.isNew.includes(p.is_new))) return false;
      if (af.materials.length && (!p.material || !af.materials.includes(p.material))) return false;
      if (af.repairTypes.length && (!p.repair_type || !af.repairTypes.includes(p.repair_type))) return false;
      if (af.priceRange[0] > 0 && (!p.price || p.price < af.priceRange[0])) return false;
      if (af.priceRange[1] < 50000000 && (!p.price || p.price > af.priceRange[1])) return false;
      if (af.rooms.length && (!p.rooms || !af.rooms.includes(p.rooms))) return false;
      if (af.areaRange[0] > 0 && (!p.area || p.area < af.areaRange[0])) return false;
      if (af.areaRange[1] < 300 && (!p.area || p.area > af.areaRange[1])) return false;
      if (af.buildYearRange[0] > 1960 && (!p.build_year || p.build_year < af.buildYearRange[0])) return false;
      if (af.buildYearRange[1] < 2025 && (!p.build_year || p.build_year > af.buildYearRange[1])) return false;
      return true;
    });
  }, [aiRecs, appliedFilters, currentBounds]);

  const displayProperties = useMemo(() => {
    if (!filteredAiRecs.length) return properties;
    const seen = new Set<string>();
    const merged: Property[] = [];
    for (const r of filteredAiRecs) {
      seen.add(r.id);
      const updated = properties.find(p => p.id === r.id);
      merged.push(updated ? { ...updated, is_ai_recommendation: true } : r);
    }
    for (const p of properties) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        merged.push(p);
      }
    }
    return merged;
  }, [filteredAiRecs, properties]);

  const clusteredMarkers = useMemo(() => {
    let visible = displayProperties;

    if (currentBounds) {
      visible = visible.filter(p => isWithinBounds(p, currentBounds));
    }

    if (visible.length > MAX_VISIBLE) {
      visible = visible.slice(0, MAX_VISIBLE);
    }

    return clusterProperties(visible, clusterZoom);
  }, [displayProperties, currentBounds, clusterZoom]);

  const buildParams = (f: MapFilters, bounds: [number, number, number, number] | null, offset: number) => {
    const params: Record<string, unknown> = {
      limit: bounds ? MAP_PAGE_SIZE : ALL_PROPERTIES_LIMIT,
      offset,
    };

    if (bounds) {
      const [north, east, south, west] = bounds;
      params.min_lat = south;
      params.max_lat = north;
      params.min_lon = west;
      params.max_lon = east;
    }
    if (f.priceRange[0] > 0) params.min_price = f.priceRange[0];
    if (f.priceRange[1] < 50000000) params.max_price = f.priceRange[1];
    if (f.areaRange[0] > 0) params.min_area = f.areaRange[0];
    if (f.areaRange[1] < 300) params.max_area = f.areaRange[1];
    if (f.buildYearRange[0] > 1960) params.min_build_year = f.buildYearRange[0];
    if (f.buildYearRange[1] < 2025) params.max_build_year = f.buildYearRange[1];
    if (f.rooms.length) params.rooms = f.rooms;
    if (f.propertyTypes.length) params.property_type = f.propertyTypes;
    if (f.propertyPurposes.length) params.property_purpose = f.propertyPurposes;
    if (f.cities.length) params.city = f.cities;
    if (f.materials.length) params.material = f.materials;
    if (f.repairTypes.length) params.repair_type = f.repairTypes;
    if (f.isNew.length) params.is_new = f.isNew;
    return params;
  };

  const fetchProperties = useCallback(async (bounds: [number, number, number, number] | null, activeFilters: MapFilters): Promise<Property[]> => {
    setIsLoading(true);
    try {
      const params = buildParams(activeFilters, bounds, 0);
      const endpoint = bounds ? `/api/properties/map` : `/api/properties/`;
      const response = await api.get(endpoint, { params });
      const data = response.data as Property[];
      setProperties(data);
      setHasData(true);
      return data;
    } catch (err) {
      console.error('Failed to fetch properties:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);


  const handleBoundsChange = useCallback((bounds: [number, number, number, number]) => {
    if (boundsTimeoutRef.current) {
      clearTimeout(boundsTimeoutRef.current);
    }
    const shouldFetch = !suppressBoundsFetchRef.current;
    suppressBoundsFetchRef.current = false;

    boundsTimeoutRef.current = setTimeout(() => {
      setCurrentBounds(bounds);
      if (shouldFetch) {
        fetchProperties(bounds, appliedFiltersRef.current);
      }
    }, 200);
  }, [fetchProperties]);

  const handleZoomChange = useCallback((zoom: number) => {
    setTrackedZoom(zoom);
  }, []);

  useEffect(() => {
    return () => {
      if (boundsTimeoutRef.current) {
        clearTimeout(boundsTimeoutRef.current);
      }
      if (clusterZoomTimeoutRef.current) {
        clearTimeout(clusterZoomTimeoutRef.current);
      }
    };
  }, []);

  const handleDraftChange = (key: keyof MapFilters, value: unknown) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = async () => {
    if (boundsTimeoutRef.current) {
      clearTimeout(boundsTimeoutRef.current);
      boundsTimeoutRef.current = null;
    }
    setAppliedFilters(draftFilters);
    setFiltersOpen(false);
    setOpenSections(new Set());

    setCurrentBounds(null);
    const data = await fetchProperties(null, draftFilters);

    if (data.length > 0) {
      const firstCity = data[0].city;
      if (firstCity && meta.city_centers[firstCity]) {
        setMapCenter(meta.city_centers[firstCity]);
        setCommandedZoom(12);
        setTrackedZoom(12);
      }
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const resetFilters = () => {
    setDraftFilters(defaultMapFilters);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    const f = appliedFilters;
    if (f.priceRange[0] > 0 || f.priceRange[1] < 50000000) count++;
    if (f.areaRange[0] > 0 || f.areaRange[1] < 300) count++;
    if (f.buildYearRange[0] > 1960 || f.buildYearRange[1] < 2025) count++;
    if (f.rooms.length) count++;
    if (f.propertyTypes.length) count++;
    if (f.propertyPurposes.length) count++;
    if (f.cities.length) count++;
    if (f.materials.length) count++;
    if (f.repairTypes.length) count++;
    if (f.isNew.length) count++;
    return count;
  }, [appliedFilters]);

  const renderFilterContent = () => (
    <>
      <div className="filter-section filter-section--open">
        <div className="filter-section__header" onClick={() => toggleSection('main')}>
          <span>Main</span>
          <span className="filter-section__arrow">{openSections.has('main') ? '▼' : '▶'}</span>
        </div>
        <div className="filter-section__body">

          <RangeSlider
            label="Price"
            min={0}
            max={50000000}
            step={100000}
            value={draftFilters.priceRange}
            onChange={(v) => handleDraftChange('priceRange', v)}
            formatLabel={(v) => `${(v / 1000000).toFixed(1)}M ₽`}
          />

          <CheckboxGroup
            label="Rooms"
            options={[
              { label: '1', value: '1' },
              { label: '2', value: '2' },
              { label: '3', value: '3' },
              { label: '4+', value: '4' },
            ]}
            selected={draftFilters.rooms.map(String)}
            onChange={(v) => handleDraftChange('rooms', v.map(Number))}
          />

          <CheckboxGroup
            label="Property type"
            options={meta.property_types.map(t => ({ label: t, value: t }))}
            selected={draftFilters.propertyTypes}
            onChange={(v) => handleDraftChange('propertyTypes', v)}
          />

          <CheckboxGroup
            label="Purpose"
            options={[
              { label: 'Sale', value: 'sale' },
              { label: 'Rent', value: 'rent' },
              { label: 'Daily rent', value: 'daily_rent' },
            ]}
            selected={draftFilters.propertyPurposes}
            onChange={(v) => handleDraftChange('propertyPurposes', v)}
          />

        </div>
      </div>

      <div className={`filter-section ${openSections.has('location') ? 'filter-section--open' : ''}`}>
        <div className="filter-section__header" onClick={() => toggleSection('location')}>
          <span>Location</span>
          <span className="filter-section__arrow">{openSections.has('location') ? '▼' : '▶'}</span>
        </div>
        <div className="filter-section__body">

          <CheckboxGroup
            label="City"
            options={meta.cities.map(c => ({ label: c, value: c }))}
            selected={draftFilters.cities}
            onChange={(v) => handleDraftChange('cities', v)}
          />

        </div>
      </div>

      <div className={`filter-section ${openSections.has('details') ? 'filter-section--open' : ''}`}>
        <div className="filter-section__header" onClick={() => toggleSection('details')}>
          <span>Details</span>
          <span className="filter-section__arrow">{openSections.has('details') ? '▼' : '▶'}</span>
        </div>
        <div className="filter-section__body">

          <RangeSlider
            label="Area (m²)"
            min={0}
            max={300}
            step={5}
            value={draftFilters.areaRange}
            onChange={(v) => handleDraftChange('areaRange', v)}
            formatLabel={(v) => `${v} m²`}
          />

          <RangeSlider
            label="Build year"
            min={1960}
            max={2025}
            step={1}
            value={draftFilters.buildYearRange}
            onChange={(v) => handleDraftChange('buildYearRange', v)}
          />

          <CheckboxGroup
            label="Material"
            options={meta.materials.map(m => ({ label: m, value: m }))}
            selected={draftFilters.materials}
            onChange={(v) => handleDraftChange('materials', v)}
          />

          <CheckboxGroup
            label="Repair type"
            options={meta.repair_types.map(r => ({ label: r, value: r }))}
            selected={draftFilters.repairTypes}
            onChange={(v) => handleDraftChange('repairTypes', v)}
          />

          <CheckboxGroup
            label="Building type"
            options={[
              { label: 'New building', value: 'new building' },
              { label: 'Secondary', value: 'secondary' },
              { label: 'Under construction', value: 'under construction' },
            ]}
            selected={draftFilters.isNew}
            onChange={(v) => handleDraftChange('isNew', v)}
          />

        </div>
      </div>

      <div className="map-filters-modal__actions">
        <button className="map-filters__reset-btn" onClick={resetFilters}>Reset</button>
        <button className="map-filters__apply-btn" onClick={applyFilters}>Apply Filters</button>
      </div>
    </>
  );

  return (
    <div className="map-page">
      <aside className="map-sidebar">
        <div className="map-sidebar__header">
          <button
            className={`map-sidebar__filter-btn ${activeFilterCount > 0 ? 'map-sidebar__filter-btn--active' : ''}`}
            onClick={() => setFiltersOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="20" y2="12" />
              <line x1="12" y1="18" x2="20" y2="18" />
              <circle cx="6" cy="6" r="2" />
              <circle cx="10" cy="12" r="2" />
              <circle cx="14" cy="18" r="2" />
            </svg>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
        </div>
        <div className="map-list">
          {isLoading && <div className="map-list__loading">Loading...</div>}
          {!isLoading && hasData && displayProperties.length === 0 && (
            <div className="map-list__empty">No properties found in this area.</div>
          )}
          {!isLoading && !hasData && displayProperties.length === 0 && (
            <div className="map-list__empty">Move the map to load properties</div>
          )}
          {displayProperties.map(prop => (
            <div key={prop.id} className={prop.id === selectedPropertyId ? 'map-list__card--selected' : ''}>
              <PropertyCard
                property={prop}
                variant="horizontal"
                showActions={false}
                isAuthenticated={isAuthenticated}
                onClick={handleCardClick}
              />
            </div>
          ))}

        </div>
      </aside>

      <main className="map-map-container">
        <YandexMap center={mapCenter} zoom={commandedZoom} onBoundsChange={handleBoundsChange} onZoomChange={handleZoomChange}>
          {clusteredMarkers.map((item, index) => {
            if (item.count === 1 && item.property) {
              const p = item.property;
              return (
                <MarkerItem
                  key={p.id}
                  propertyId={p.id}
                  coordinates={item.coordinates}
                  isSelected={p.id === selectedPropertyId}
                  isZoomedOut={isZoomedOut}
                  price={Number(p.price)}
                  address={p.address}
                  onMarkerClick={handleMarkerClick}
                />
              );
            }
            return (
              <ClusterItem
                key={`cluster-${index}`}
                coordinates={item.coordinates}
                count={item.count}
                onClusterZoom={handleClusterZoom}
              />
            );
          })}
        </YandexMap>

        <Modal isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
          {renderFilterContent()}
        </Modal>
      </main>
    </div>
  );
};

export default MapPage;
