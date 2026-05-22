import React from 'react';
import PropertyCard from '@entities/property/ui/PropertyCard';
import type { Property } from '@shared/api/types';

interface PropertyGridProps {
  properties: Property[];
  isLoading: boolean;
  hasMore: boolean;
  activeTab: string;
  isAuthenticated: boolean;
  loaderRef: React.RefObject<HTMLDivElement | null>;
  onLikeToggle: (propertyId: string, isLiked: boolean) => void;
}

const PropertyGrid: React.FC<PropertyGridProps> = ({
  properties, isLoading, hasMore, activeTab, isAuthenticated, loaderRef, onLikeToggle,
}) => (
  <>
    {isLoading && properties.length === 0 && <div className="catalog-loading">Loading...</div>}
    {!isLoading && properties.length === 0 && (
      <div className="catalog-empty">
        {activeTab === 'viewed' && 'No viewed properties yet.'}
        {activeTab === 'liked' && 'No liked properties yet.'}
        {activeTab === 'all' && 'No properties found.'}
      </div>
    )}
    <div className="catalog-grid">
      {  properties.map((prop, _index) => (
        <PropertyCard
          key={`${activeTab}-${prop.id}`}
          property={prop}
          showActions
          isAuthenticated={isAuthenticated}
          onLikeToggle={(propertyId, isLiked) => onLikeToggle(propertyId, isLiked)}
        />
      ))}
    </div>
    {hasMore && (
      <div ref={loaderRef} className="catalog-loader">
        {isLoading && <div>Loading more...</div>}
      </div>
    )}
  </>
);

export default PropertyGrid;
