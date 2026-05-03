import React, { useState, useEffect } from 'react';
import YandexMap from '@shared/ui/Map';
import { YMapMarker } from '@shared/api/ymaps3';
import PropertyCard from '@entities/property/ui';
import { Property } from '@entities/property/model/types';
import api from '@shared/api/api';
import './Catalog.scss';

const Catalog: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProperties = async (bounds: [number, number, number, number]) => {
    setIsLoading(true);
    try {
      const [north, east, south, west] = bounds;
      const response = await api.get(`/api/properties/map`, {
        params: {
          bbox: `${west},${south},${east},${north}`
        }
      });
      setProperties(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBoundsChange = (bounds: [number, number, number, number]) => {
    fetchProperties(bounds);
  };

  return (
    <div className="catalog-page">
      <aside className="catalog-sidebar">
        <div className="catalog-filters">
          <h3>Filters</h3>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <input type="number" placeholder="Min Price" />
            <input type="number" placeholder="Max Price" />
          </div>
        </div>
        <div className="catalog-list">
          {isLoading && <div style={{ textAlign: 'center' }}>Loading...</div>}
          {!isLoading && properties.length === 0 && (
            <div style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>
              No properties found in this area.
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
              coordinates={[prop.coordinates[1], prop.coordinates[0]]}
            >
              <div className="map-marker-label">
                {prop.price.toLocaleString()} ₽
              </div>
            </YMapMarker>
          ))}
        </YandexMap>
      </main>
    </div>
  );
};

export default Catalog;
