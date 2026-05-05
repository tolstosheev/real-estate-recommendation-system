import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppSelector } from '@app/store/hooks';
import PropertyCard from '@entities/property/ui/PropertyCard';
import type { Property } from '@entities/property/model/types';
import api from '@shared/api/api';
import cn from 'classnames';
import './Catalog.scss';

type TabType = 'all' | 'viewed' | 'liked';

const CATALOG_PAGE_SIZE = 12;

const Catalog: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [filters, setFilters] = useState({
    search: '',
    minPrice: '',
    maxPrice: '',
    rooms: '',
    propertyType: '',
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchProperties = useCallback(async (tab: TabType, pageNum: number, isNewTab = false) => {
    setIsLoading(true);
    try {
      let url = '/api/properties/';
      const params: Record<string, string | number> = {
        limit: CATALOG_PAGE_SIZE,
        offset: (pageNum - 1) * CATALOG_PAGE_SIZE,
      };

      if (tab === 'liked' && isAuthenticated) {
        url = '/api/interactions/favorites';
      } else if (tab === 'viewed' && isAuthenticated) {
        url = '/api/interactions/history';
      } else {
        if (filters.minPrice) params.min_price = filters.minPrice;
        if (filters.maxPrice) params.max_price = filters.maxPrice;
        if (filters.rooms) params.rooms = filters.rooms;
        if (filters.propertyType) params.property_type = filters.propertyType;
        if (filters.search) params.search = filters.search;
      }

      const response = await api.get(url, { params });
      const data = response.data as Property[];

      if (isNewTab) {
        setProperties(data);
      } else {
        setProperties(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = data.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      }

      setHasMore(data.length === CATALOG_PAGE_SIZE);
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, filters]);

  useEffect(() => {
    setProperties([]);
    setPage(1);
    setHasMore(true);
    fetchProperties(activeTab, 1, true);
  }, [activeTab, fetchProperties]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 1.0 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading]);

  useEffect(() => {
    if (page > 1) {
      fetchProperties(activeTab, page, false);
    }
  }, [page, activeTab, fetchProperties]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setProperties([]);
    setPage(1);
    setHasMore(true);
    fetchProperties(activeTab, 1, true);
  };

  const handleLikeToggle = (propertyId: string, isLiked: boolean, currentLikes: number) => {
    setProperties(prev => 
      prev.map(p => p.id === propertyId ? { 
        ...p, 
        is_liked_by_me: isLiked,
        likes_count: isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1)
      } : p)
    );
    if (activeTab === 'liked' && !isLiked) {
      setProperties(prev => prev.filter(p => p.id !== propertyId));
    }
  };

  return (
    <div className="catalog-page">
      <aside className="catalog-sidebar">
        <div className="catalog-search">
          <input
            type="text"
            placeholder="Search properties..."
            className="catalog-search__input"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
          />
        </div>

         <div className="catalog-filters">
           <h3 className="catalog-filters__title">Filters</h3>
           <div className={cn("catalog-filters__grid", { 'catalog-filters__disabled': activeTab !== 'all' })}>
             <input
               type="number"
               placeholder="Min Price"
               className="catalog-filters__input"
               value={filters.minPrice}
               onChange={(e) => activeTab === 'all' && handleFilterChange('minPrice', e.target.value)}
               disabled={activeTab !== 'all'}
             />
             <input
               type="number"
               placeholder="Max Price"
               className="catalog-filters__input"
               value={filters.maxPrice}
               onChange={(e) => activeTab === 'all' && handleFilterChange('maxPrice', e.target.value)}
               disabled={activeTab !== 'all'}
             />
             <input
               type="number"
               placeholder="Rooms"
               className="catalog-filters__input"
               value={filters.rooms}
               onChange={(e) => activeTab === 'all' && handleFilterChange('rooms', e.target.value)}
               disabled={activeTab !== 'all'}
             />
             <select
               className="catalog-filters__input"
               value={filters.propertyType}
               onChange={(e) => activeTab === 'all' && handleFilterChange('propertyType', e.target.value)}
               disabled={activeTab !== 'all'}
             >
               <option value="">Any type</option>
               <option value="Apartment">Apartment</option>
               <option value="House">House</option>
               <option value="Commercial">Commercial</option>
             </select>
           </div>
           {activeTab === 'all' && (
             <button className="catalog-filters__apply-btn" onClick={applyFilters}>
               Apply Filters
             </button>
           )}
         </div>


        <div className="catalog-tabs">
          <button
            className={`catalog-tab ${activeTab === 'all' ? 'catalog-tab--active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`catalog-tab ${activeTab === 'viewed' ? 'catalog-tab--active' : ''}`}
            onClick={() => setActiveTab('viewed')}
          >
            Viewed
          </button>
          <button
            className={`catalog-tab ${activeTab === 'liked' ? 'catalog-tab--active' : ''}`}
            onClick={() => setActiveTab('liked')}
          >
            Liked
          </button>
        </div>
      </aside>

      <main className="catalog-content">
        {isLoading && properties.length === 0 && <div className="catalog-loading">Loading...</div>}
        {!isLoading && properties.length === 0 && (
          <div className="catalog-empty">
            {activeTab === 'viewed' && 'No viewed properties yet.'}
            {activeTab === 'liked' && 'No liked properties yet.'}
            {activeTab === 'all' && 'No properties found.'}
          </div>
        )}
        <div className="catalog-grid">
          {properties.map((prop, index) => (
             <PropertyCard 
               key={`${activeTab}-${prop.id}-${index}`} 
               property={prop} 
               showActions={true} 
               onLikeToggle={(propertyId, isLiked) => handleLikeToggle(propertyId, isLiked, prop.likes_count)}
             />

          ))}
        </div>
        {hasMore && (
          <div ref={loaderRef} className="catalog-loader">
            {isLoading && <div>Loading more...</div>}
          </div>
        )}
      </main>
    </div>
  );
};

export default Catalog;
