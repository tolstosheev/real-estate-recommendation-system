import React, { useState, useCallback, useRef } from 'react';
import YandexMap from '@shared/ui/Map';
import YMapMarker from '@shared/ui/Map/YMapMarker';
import PropertyCard from '@entities/property/ui/PropertyCard';
import type { Property } from '@entities/property/model/types';
import api from '@shared/api/api';
import './Catalog.scss';

const Catalog: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [currentBounds, setCurrentBounds] = useState<[number, number, number, number] | null>(null);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    rooms: '',
    propertyType: '',
  });
  const boundsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProperties = useCallback(async (bounds: [number, number, number, number], activeFilters: typeof filters) => {
    setIsLoading(true);
    try {
      const [north, east, south, west] = bounds;
      const params: Record<string, string | number> = {
        min_lat: south,
        max_lat: north,
        min_lon: west,
        max_lon: east,
        limit: 200,
      };

      if (activeFilters.minPrice) params.min_price = Number(activeFilters.minPrice);
      if (activeFilters.maxPrice) params.max_price = Number(activeFilters.maxPrice);
      if (activeFilters.rooms) params.rooms = Number(activeFilters.rooms);
      if (activeFilters.propertyType) params.property_type = activeFilters.propertyType;

      const response = await api.get(`/api/properties/map`, { params });
      setProperties(response.data);
      setHasData(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBoundsChange = (bounds: [number, number, number, number]) => {
    setCurrentBounds(bounds);
    if (boundsTimeoutRef.current) {
      clearTimeout(boundsTimeoutRef.current);
    }
    boundsTimeoutRef.current = setTimeout(() => {
      fetchProperties(bounds, filters);
    }, 500) as unknown as ReturnType<typeof setTimeout>;
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    if (currentBounds) {
      fetchProperties(currentBounds, filters);
    } else {
      fetchProperties([56.5, 38.5, 55.0, 36.5], filters);
    }
  };

  return (
    <div className="catalog-page">
      <aside className="catalog-sidebar">
        <div className="catalog-filters">
          <h3 className="catalog-filters__title">Filters</h3>
          <div className="catalog-filters__grid">
            <input
              type="number"
              placeholder="Min Price"
              className="catalog-filters__input"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            />
            <input
              type="number"
              placeholder="Max Price"
              className="catalog-filters__input"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            />
            <input
              type="number"
              placeholder="Rooms"
              className="catalog-filters__input"
              value={filters.rooms}
              onChange={(e) => handleFilterChange('rooms', e.target.value)}
            />
            <select
              className="catalog-filters__input"
              value={filters.propertyType}
              onChange={(e) => handleFilterChange('propertyType', e.target.value)}
            >
              <option value="">Any type</option>
              <option value="Apartment">Apartment</option>
              <option value="House">House</option>
              <option value="Commercial">Commercial</option>
            </select>
          </div>
          <button className="catalog-filters__apply-btn" onClick={applyFilters}>
            Apply Filters
          </button>
        </div>
        <div className="catalog-list">
          {isLoading && <div className="catalog-list__loading">Loading...</div>}
          {!isLoading && hasData && properties.length === 0 && (
            <div className="catalog-list__empty">
              No properties found in this area.
            </div>
          )}
          {!isLoading && !hasData && (
            <div className="catalog-list__empty">
              Move the map to load properties
            </div>
          )}
          {properties.map(prop => (
            <PropertyCard key={prop.id} property={prop} variant="horizontal" />
          ))}
        </div>
      </aside>
      <main className="catalog-map-container">
        <YandexMap onBoundsChange={handleBoundsChange}>
          {properties.map(prop => (
            <YMapMarker
              key={prop.id}
              coordinates={[prop.lat, prop.lon]}
            >
              <div className="map-marker-label">
                {Number(prop.price).toLocaleString()} ₽
              </div>
            </YMapMarker>
          ))}
        </YandexMap>
      </main>
    </div>
  );
};

export default Catalog;
