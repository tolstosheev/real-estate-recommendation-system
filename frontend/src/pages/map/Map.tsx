import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@app/store/hooks';
import YandexMap from '@shared/ui/Map';
import YMapMarker from '@shared/ui/Map/YMapMarker';
import PropertyCard from '@entities/property/ui/PropertyCard';
import type { Property } from '@entities/property/model/types';
import { propertyService } from '@shared/api/properties.service';
import { recommendationsService } from '@shared/api/recommendations.service';
import api from '@shared/api/api';
import './Map.scss';

const MAP_PAGE_SIZE = 10;

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  
  const handleMarkerClick = (propertyId: string) => {
    navigate(`/property/${propertyId}`);
  };
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [currentBounds, setCurrentBounds] = useState<[number, number, number, number] | null>(null);
  const [aiRecs, setAiRecs] = useState<Property[]>([]);
  const [meta, setMeta] = useState<{ cities: string[]; materials: string[]; repair_types: string[]; property_types: string[] }>({
    cities: [], materials: [], repair_types: [], property_types: []
  });
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    rooms: '',
    propertyType: '',
    material: '',
    repairType: '',
    minBuildYear: '',
    maxBuildYear: '',
    propertyPurpose: '',
    city: '',
    areaFrom: '',
    areaTo: '',
    isNew: '',
  });
  const [hasMore, setHasMore] = useState(false);
  const mapOffsetRef = useRef(0);
  const boundsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<() => void>(() => {});

  useEffect(() => {
    propertyService.getMeta().then(data => {
      setMeta({
        cities: data.cities || [],
        materials: data.materials || [],
        repair_types: data.repair_types || [],
        property_types: data.property_types || [],
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      recommendationsService.getRecommendations().then(setAiRecs).catch(() => {});
    } else {
      setAiRecs([]);
    }
  }, [isAuthenticated]);

  const filteredAiRecs = useMemo(() => {
    if (!aiRecs.length) return [];
    return aiRecs.filter(p => {
      if (filters.city && p.city !== filters.city) return false;
      if (filters.propertyType && p.property_type !== filters.propertyType) return false;
      if (filters.propertyPurpose && p.property_purpose !== filters.propertyPurpose) return false;
      if (filters.isNew && p.is_new !== filters.isNew) return false;
      if (filters.material && p.material !== filters.material) return false;
      if (filters.repairType && p.repair_type !== filters.repairType) return false;
      if (filters.minPrice && (!p.price || p.price < Number(filters.minPrice))) return false;
      if (filters.maxPrice && (!p.price || p.price > Number(filters.maxPrice))) return false;
      if (filters.rooms && p.rooms !== Number(filters.rooms)) return false;
      if (filters.areaFrom && (!p.area || p.area < Number(filters.areaFrom))) return false;
      if (filters.areaTo && (!p.area || p.area > Number(filters.areaTo))) return false;
      if (filters.minBuildYear && (!p.build_year || p.build_year < Number(filters.minBuildYear))) return false;
      if (filters.maxBuildYear && (!p.build_year || p.build_year > Number(filters.maxBuildYear))) return false;
      return true;
    });
  }, [aiRecs, filters]);

  const displayProperties = useMemo(() => {
    if (!filteredAiRecs.length) return properties;
    const merged = [
      ...filteredAiRecs.map(r => {
        const updated = properties.find(p => p.id === r.id);
        return { ...r, ...updated, is_ai_recommendation: true, id: r.id };
      }),
      ...properties.filter(p => !filteredAiRecs.some(ai => ai.id === p.id)),
    ];
    return merged;
  }, [filteredAiRecs, properties]);

  const fetchProperties = useCallback(async (bounds: [number, number, number, number], activeFilters: typeof filters, offset: number, append = false) => {
    setIsLoading(true);
    try {
      const [north, east, south, west] = bounds;
      const params: Record<string, string | number> = {
        min_lat: south,
        max_lat: north,
        min_lon: west,
        max_lon: east,
        limit: MAP_PAGE_SIZE,
        offset,
      };

      if (activeFilters.minPrice) params.min_price = Number(activeFilters.minPrice);
      if (activeFilters.maxPrice) params.max_price = Number(activeFilters.maxPrice);
      if (activeFilters.rooms) params.rooms = Number(activeFilters.rooms);
      if (activeFilters.propertyType) params.property_type = activeFilters.propertyType;
      if (activeFilters.propertyPurpose) params.property_purpose = activeFilters.propertyPurpose;
      if (activeFilters.material) params.material = activeFilters.material;
      if (activeFilters.repairType) params.repair_type = activeFilters.repairType;
      if (activeFilters.minBuildYear) params.min_build_year = Number(activeFilters.minBuildYear);
      if (activeFilters.maxBuildYear) params.max_build_year = Number(activeFilters.maxBuildYear);
      if (activeFilters.city) params.city = activeFilters.city;
      if (activeFilters.areaFrom) params.min_area = Number(activeFilters.areaFrom);
      if (activeFilters.areaTo) params.max_area = Number(activeFilters.areaTo);
      if (activeFilters.isNew) params.is_new = activeFilters.isNew;

      const response = await api.get(`/api/properties/map`, { params });
      const data = response.data as Property[];

      if (append) {
        setProperties(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = data.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      } else {
        setProperties(data);
      }

      setHasMore(data.length === MAP_PAGE_SIZE);
      setHasData(true);
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = () => {
    mapOffsetRef.current += MAP_PAGE_SIZE;
    if (currentBounds) {
      fetchProperties(currentBounds, filters, mapOffsetRef.current, true);
    }
  };
  loadMoreRef.current = loadMore;

  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadMoreRef.current();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading]);

  // Center is now handled by onBoundsChange

  const handleBoundsChange = (bounds: [number, number, number, number]) => {
    setCurrentBounds(bounds);
    mapOffsetRef.current = 0;
    if (boundsTimeoutRef.current) {
      clearTimeout(boundsTimeoutRef.current);
    }
    boundsTimeoutRef.current = setTimeout(() => {
      fetchProperties(bounds, filters, 0, false);
    }, 500) as unknown as ReturnType<typeof setTimeout>;
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    mapOffsetRef.current = 0;
    if (currentBounds) {
      fetchProperties(currentBounds, filters, 0, false);
    } else {
      fetchProperties([56.5, 38.5, 55.0, 36.5], filters, 0, false);
    }
  };

  return (
    <div className="map-page">
      <aside className="map-sidebar">
            <div className="map-filters">
            <h3 className="map-filters__title">Filters</h3>
            <div className="map-filters__grid">
              <input
                type="number"
                placeholder="Min Price"
                className="map-filters__input"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              />
              <input
                type="number"
                placeholder="Max Price"
                className="map-filters__input"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              />
              <input
                type="number"
                placeholder="Min Area"
                className="map-filters__input"
                value={filters.areaFrom}
                onChange={(e) => handleFilterChange('areaFrom', e.target.value)}
              />
              <input
                type="number"
                placeholder="Max Area"
                className="map-filters__input"
                value={filters.areaTo}
                onChange={(e) => handleFilterChange('areaTo', e.target.value)}
              />
              <input
                type="number"
                placeholder="Rooms"
                className="map-filters__input"
                value={filters.rooms}
                onChange={(e) => handleFilterChange('rooms', e.target.value)}
              />
              <select
                className="map-filters__input"
                value={filters.propertyType}
                onChange={(e) => handleFilterChange('propertyType', e.target.value)}
              >
                <option value="">Any type</option>
                {meta.property_types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                className="map-filters__input"
                value={filters.propertyPurpose}
                onChange={(e) => handleFilterChange('propertyPurpose', e.target.value)}
              >
                <option value="">Any purpose</option>
                <option value="sale">Sale</option>
                <option value="rent">Rent</option>
              </select>
              <select
                className="map-filters__input"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
              >
                <option value="">Any city</option>
                {meta.cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                className="map-filters__input"
                value={filters.isNew}
                onChange={(e) => handleFilterChange('isNew', e.target.value)}
              >
                <option value="">Any building type</option>
                <option value="новостройка">New building</option>
                <option value="вторичка">Secondary</option>
              </select>
              <select
                className="map-filters__input"
                value={filters.material}
                onChange={(e) => handleFilterChange('material', e.target.value)}
              >
                <option value="">Any material</option>
                {meta.materials.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                className="map-filters__input"
                value={filters.repairType}
                onChange={(e) => handleFilterChange('repairType', e.target.value)}
              >
                <option value="">Any repair</option>
                {meta.repair_types.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input
                type="number"
                placeholder="Min Year"
                className="map-filters__input"
                value={filters.minBuildYear}
                onChange={(e) => handleFilterChange('minBuildYear', e.target.value)}
              />
              <input
                type="number"
                placeholder="Max Year"
                className="map-filters__input"
                value={filters.maxBuildYear}
                onChange={(e) => handleFilterChange('maxBuildYear', e.target.value)}
              />
            </div>
          <button className="map-filters__apply-btn" onClick={applyFilters}>
            Apply Filters
          </button>
        </div>
        <div className="map-list">
          {isLoading && <div className="map-list__loading">Loading...</div>}
          {!isLoading && hasData && displayProperties.length === 0 && (
            <div className="map-list__empty">
              No properties found in this area.
            </div>
          )}
          {!isLoading && !hasData && displayProperties.length === 0 && (
            <div className="map-list__empty">
              Move the map to load properties
            </div>
          )}
          {displayProperties.map(prop => (
            <PropertyCard key={prop.id} property={prop} variant="horizontal" />
          ))}
          {hasMore && (
            <div ref={loaderRef} className="map-list__load-more">
              {isLoading ? <span>Loading more...</span> : <span>Scroll for more</span>}
            </div>
          )}
        </div>
      </aside>
        <main className="map-map-container">
        <YandexMap onBoundsChange={handleBoundsChange}>
          {displayProperties.map(prop => (
            <YMapMarker
              key={prop.id}
              coordinates={[prop.lon, prop.lat]}
              onClick={() => handleMarkerClick(prop.id)}
            >
              <div className="map-marker-label">
                <div className="map-marker-label__title">{prop.title}</div>
                <div className="map-marker-label__price">{Number(prop.price).toLocaleString()} ₽</div>
              </div>
            </YMapMarker>
          ))}
        </YandexMap>
      </main>
    </div>
  );
};

export default MapPage;