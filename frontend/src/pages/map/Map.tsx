import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import YandexMap from '@shared/ui/Map';
import YMapMarker from '@shared/ui/Map/YMapMarker';
import PropertyCard from '@entities/property/ui/PropertyCard';
import type { Property } from '@entities/property/model/types';
import api from '@shared/api/api';
import './Map.scss';

const MAP_PAGE_SIZE = 10;

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  
  const handleMarkerClick = (propertyId: string) => {
    console.log('Marker clicked, navigating to:', propertyId);
    navigate(`/property/${propertyId}`);
  };
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [currentBounds, setCurrentBounds] = useState<[number, number, number, number] | null>(null);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    rooms: '',
    propertyType: '',
    district: '',
    metro: '',
    material: '',
    repairType: '',
    minBuildYear: '',
    maxBuildYear: '',
    propertyPurpose: '',
  });
  const [visibleCount, setVisibleCount] = useState(MAP_PAGE_SIZE);
  const boundsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + MAP_PAGE_SIZE, properties.length));
  };

  const fetchProperties = useCallback(async (bounds: [number, number, number, number], activeFilters: typeof filters, reset = false) => {
    setIsLoading(true);
    try {
      const [north, east, south, west] = bounds;
      const params: Record<string, string | number> = {
        min_lat: south,
        max_lat: north,
        min_lon: west,
        max_lon: east,
        limit: reset ? MAP_PAGE_SIZE : properties.length + MAP_PAGE_SIZE,
      };

      if (activeFilters.minPrice) params.min_price = Number(activeFilters.minPrice);
      if (activeFilters.maxPrice) params.max_price = Number(activeFilters.maxPrice);
      if (activeFilters.rooms) params.rooms = Number(activeFilters.rooms);
      if (activeFilters.propertyType) params.property_type = activeFilters.propertyType;
      if (activeFilters.propertyPurpose) params.property_purpose = activeFilters.propertyPurpose;
      if (activeFilters.district) params.district = activeFilters.district;
      if (activeFilters.metro) params.metro = activeFilters.metro;
      if (activeFilters.material) params.material = activeFilters.material;
      if (activeFilters.repairType) params.repair_type = activeFilters.repairType;
      if (activeFilters.minBuildYear) params.min_build_year = Number(activeFilters.minBuildYear);
      if (activeFilters.maxBuildYear) params.max_build_year = Number(activeFilters.maxBuildYear);

      const response = await api.get(`/api/properties/map`, { params });
      
      if (reset) {
        setProperties(response.data);
        setVisibleCount(MAP_PAGE_SIZE);
      } else {
        setProperties(prev => [...prev, ...response.data]);
      }
      setHasData(true);
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    } finally {
      setIsLoading(false);
    }
  }, [properties.length]);

  const handleBoundsChange = (bounds: [number, number, number, number]) => {
    setCurrentBounds(bounds);
    if (boundsTimeoutRef.current) {
      clearTimeout(boundsTimeoutRef.current);
    }
    boundsTimeoutRef.current = setTimeout(() => {
      fetchProperties(bounds, filters, true);
    }, 500) as unknown as ReturnType<typeof setTimeout>;
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setVisibleCount(MAP_PAGE_SIZE);
    if (currentBounds) {
      fetchProperties(currentBounds, filters, true);
    } else {
      fetchProperties([56.5, 38.5, 55.0, 36.5], filters, true);
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
              <option value="Apartment">Apartment</option>
              <option value="House">House</option>
              <option value="Commercial">Commercial</option>
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
            <input
              type="text"
              placeholder="District"
              className="map-filters__input"
              value={filters.district}
              onChange={(e) => handleFilterChange('district', e.target.value)}
            />
            <input
              type="text"
              placeholder="Metro"
              className="map-filters__input"
              value={filters.metro}
              onChange={(e) => handleFilterChange('metro', e.target.value)}
            />
            <select
              className="map-filters__input"
              value={filters.material}
              onChange={(e) => handleFilterChange('material', e.target.value)}
            >
              <option value="">Any material</option>
              <option value="Brick">Brick</option>
              <option value="Panel">Panel</option>
              <option value="Monolith">Monolith</option>
              <option value="Brick-Monolith">Brick-Monolith</option>
              <option value="Wood">Wood</option>
              <option value="Block">Block</option>
            </select>
            <select
              className="map-filters__input"
              value={filters.repairType}
              onChange={(e) => handleFilterChange('repairType', e.target.value)}
            >
              <option value="">Any repair</option>
              <option value="Cosmetic">Cosmetic</option>
              <option value="Euro">Euro</option>
              <option value="Design">Design</option>
              <option value="Rough">Rough</option>
              <option value="Renovated">Renovated</option>
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
          {!isLoading && hasData && properties.length === 0 && (
            <div className="map-list__empty">
              No properties found in this area.
            </div>
          )}
          {!isLoading && !hasData && (
            <div className="map-list__empty">
              Move the map to load properties
            </div>
          )}
          {properties.slice(0, visibleCount).map(prop => (
            <PropertyCard key={prop.id} property={prop} variant="horizontal" />
          ))}
          {visibleCount < properties.length && (
            <button className="map-list__load-more" onClick={loadMore}>
              Load More ({properties.length - visibleCount} remaining)
            </button>
          )}
        </div>
      </aside>
       <main className="map-map-container">
        <YandexMap onBoundsChange={handleBoundsChange}>
          {properties.slice(0, visibleCount).map(prop => (
              <YMapMarker
                key={prop.id}
                coordinates={[prop.lat, prop.lon]}
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
