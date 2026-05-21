import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '@app/store/hooks';
import YandexMap from '@shared/ui/Map';
import PropertyCard from '@entities/property/ui/PropertyCard';
import Modal from '@shared/ui/Modal';
import type { Property } from '@shared/api/types';
import { propertyService } from '@shared/api/properties.service';
import { recommendationsService } from '@shared/api/recommendations.service';
import api from '@shared/api/api';
import FilterPanel from '@widgets/FilterPanel';
import { parseFilters, filtersToSearchParams } from '@shared/utils/filterParams';
import type { FilterValues } from '@shared/utils/filterParams';
import { MarkerItem, ClusterItem } from './ui';
import { isWithinBounds, clusterProperties, MAX_VISIBLE } from './utils';
import './Map.scss';

type MapFilters = FilterValues;

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
const SESSION_KEY = 'nestai_map_position';

function loadSavedPosition(): { lon: number; lat: number; zoom: number } | null {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (typeof data.lon === 'number' && typeof data.lat === 'number' && typeof data.zoom === 'number'
        && isFinite(data.lon) && isFinite(data.lat) && isFinite(data.zoom)) {
        return data;
      }
    }
  } catch {
    // ignore session storage errors
  }
  return null;
}

function savePosition(lon: number, lat: number, zoom: number): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ lon, lat, zoom }));
  } catch {
    // ignore session storage errors
  }
}

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const handleMarkerClick = useCallback((propertyId: string) => {
    navigate(`/property/${propertyId}`);
  }, [navigate]);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(() => {
    const saved = loadSavedPosition();
    if (saved) return [saved.lon, saved.lat];
    return [37.6173, 55.7558];
  });
  const [commandedZoom, setCommandedZoom] = useState(() => {
    const saved = loadSavedPosition();
    return saved?.zoom ?? 11;
  });
  const [trackedZoom, setTrackedZoom] = useState(() => {
    const saved = loadSavedPosition();
    return saved?.zoom ?? 11;
  });
  const trackedZoomRef = useRef(trackedZoom);
  const isFirstPositionSaveRef = useRef(true);
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
  const [meta, setMeta] = useState<{
    cities: string[];
    materials: string[];
    repair_types: string[];
    property_types: string[];
    city_centers: Record<string, [number, number]>;
  }>({
    cities: [], materials: [], repair_types: [], property_types: [], city_centers: {},
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [draftFilters, setDraftFilters] = useState<MapFilters>(() =>
    parseFilters(new URLSearchParams(window.location.search), defaultMapFilters)
  );
  const boundsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialFetch = useRef(false);
  const suppressBoundsFetchRef = useRef(true);

  const urlFilters = useMemo(() => parseFilters(searchParams, defaultMapFilters), [searchParams]);
  const urlFiltersRef = useRef(urlFilters);
  urlFiltersRef.current = urlFilters;

  useEffect(() => {
    if (!hasInitialFetch.current) {
      hasInitialFetch.current = true;

      const hasSavedPosition = loadSavedPosition() !== null;

      if (!hasSavedPosition && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setMapCenter([position.coords.longitude, position.coords.latitude]);
            setCommandedZoom(12);
            setTrackedZoom(12);
          },
          () => { /* geolocation error, keep defaults */ },
          { timeout: 5000, enableHighAccuracy: false }
        );
      }

      setCurrentBounds(null);
      fetchProperties(null, urlFiltersRef.current);
    }
  // mount-only fetch; deps change would cause duplicate requests
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL change → re-fetch (skip initial mount)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchProperties(null, urlFilters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    propertyService.getMeta().then(data => {
      setMeta({
        cities: data.cities || [],
        materials: data.materials || [],
        repair_types: data.repair_types || [],
        property_types: data.property_types || [],
        city_centers: data.city_centers || {},
      });
    }).catch(() => { /* meta fetch is optional */ });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      recommendationsService.getRecommendations().then(setAiRecs).catch(() => { /* recs fetch is optional */ });
    } else {
      setAiRecs([]);
    }
  }, [isAuthenticated]);

  useEffect(() => { trackedZoomRef.current = trackedZoom; }, [trackedZoom]);

  const clusterZoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (clusterZoomTimeoutRef.current) {
      clearTimeout(clusterZoomTimeoutRef.current);
    }
    clusterZoomTimeoutRef.current = setTimeout(() => {
      setClusterZoom(trackedZoom);
    }, 150);
  }, [trackedZoom]);

  useEffect(() => {
    if (isFirstPositionSaveRef.current) {
      isFirstPositionSaveRef.current = false;
      return;
    }
    savePosition(mapCenter[0], mapCenter[1], commandedZoom);
  }, [mapCenter, commandedZoom]);

  const filteredAiRecs = useMemo(() => {
    if (!aiRecs.length) return [];
    return aiRecs.filter(p => {
      if (currentBounds && !isWithinBounds(p, currentBounds)) return false;
      const af = urlFilters;
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
  }, [aiRecs, urlFilters, currentBounds]);

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
        const centerLat = (bounds[0] + bounds[2]) / 2;
        const centerLon = (bounds[1] + bounds[3]) / 2;
        savePosition(centerLon, centerLat, trackedZoomRef.current);
        fetchProperties(bounds, urlFiltersRef.current);
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
    setSearchParams(filtersToSearchParams(draftFilters, '', defaultMapFilters));
    setFiltersOpen(false);

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

  const resetFilters = async () => {
    setDraftFilters(defaultMapFilters);
    setSearchParams(filtersToSearchParams(defaultMapFilters, '', defaultMapFilters));
    setFiltersOpen(false);
    setCurrentBounds(null);
    const data = await fetchProperties(null, defaultMapFilters);
    if (data.length > 0) {
      const firstCity = data[0].city;
      if (firstCity && meta.city_centers[firstCity]) {
        setMapCenter(meta.city_centers[firstCity]);
        setCommandedZoom(12);
        setTrackedZoom(12);
      }
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    const f = urlFilters;
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
  }, [urlFilters]);

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
          <FilterPanel
            filters={draftFilters}
            meta={{ cities: meta.cities, materials: meta.materials, repair_types: meta.repair_types, property_types: meta.property_types }}
            onFilterChange={handleDraftChange}
            onApply={applyFilters}
            onReset={resetFilters}
          />
        </Modal>
      </main>
    </div>
  );
};

export default MapPage;
