import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import YandexMap from '@shared/ui/Map';
import YMapMarker from '@shared/ui/Map/YMapMarker';
import PropertyCard from '@entities/property/ui/PropertyCard';
import type { Property } from '@entities/property/model/types';
import api from '@shared/api/api';
import './Catalog.scss';

const CATALOG_PAGE_SIZE = 10;

const Catalog: React.FC = () => {
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
  });
  const [visibleCount, setVisibleCount] = useState(CATALOG_PAGE_SIZE);
  const boundsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + CATALOG_PAGE_SIZE, properties.length));
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
        limit: reset ? CATALOG_PAGE_SIZE : properties.length + CATALOG_PAGE_SIZE,
      };

      if (activeFilters.minPrice) params.min_price = Number(activeFilters.minPrice);
      if (activeFilters.maxPrice) params.max_price = Number(activeFilters.maxPrice);
      if (activeFilters.rooms) params.rooms = Number(activeFilters.rooms);
      if (activeFilters.propertyType) params.property_type = activeFilters.propertyType;

      const response = await api.get(`/api/properties/map`, { params });
      
      if (reset) {
        setProperties(response.data);
        setVisibleCount(CATALOG_PAGE_SIZE);
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
    setVisibleCount(CATALOG_PAGE_SIZE);
    if (currentBounds) {
      fetchProperties(currentBounds, filters, true);
    } else {
      fetchProperties([56.5, 38.5, 55.0, 36.5], filters, true);
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
          {properties.slice(0, visibleCount).map(prop => (
            <PropertyCard key={prop.id} property={prop} variant="horizontal" />
          ))}
          {visibleCount < properties.length && (
            <button className="catalog-list__load-more" onClick={loadMore}>
              Load More ({properties.length - visibleCount} remaining)
            </button>
          )}
        </div>
      </aside>
       <main className="catalog-map-container">
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

export default Catalog;
