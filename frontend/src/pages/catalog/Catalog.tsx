import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './Catalog.scss'
import { useAppSelector } from '@app/store/hooks';
import PropertyCard from '@entities/property/ui/PropertyCard';
import type { Property } from '@entities/property/model/types';
import { propertyService } from '@shared/api/properties.service';
import { recommendationsService } from '@shared/api/recommendations.service';
import cn from 'classnames';
import api from '@shared/api/api';

type TabType = 'all' | 'viewed' | 'liked';

const CATALOG_PAGE_SIZE = 12;

const Catalog: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [aiRecs, setAiRecs] = useState<Property[]>([]);
  const [filters, setFilters] = useState({
    search: '',
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  const filteredAiRecs = useMemo(() => {
    if (activeTab !== 'all' || !aiRecs.length) return [];
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
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (p.title && !p.title.toLowerCase().includes(q) && p.address && !p.address.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [aiRecs, filters, activeTab]);
  const [meta, setMeta] = useState<{
    districts: string[];
    metro: string[];
    materials: string[];
    repair_types: string[];
    property_types: string[];
    cities: string[];
  }>({ districts: [], metro: [], materials: [], repair_types: [], property_types: [], cities: [] });

  useEffect(() => {
    propertyService.getMeta().then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'all') {
      recommendationsService.getRecommendations().then(setAiRecs).catch(() => {});
    } else {
      setAiRecs([]);
    }
  }, [isAuthenticated, activeTab]);

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
        if (filters.propertyPurpose) params.property_purpose = filters.propertyPurpose;
        if (filters.material) params.material = filters.material;
        if (filters.repairType) params.repair_type = filters.repairType;
        if (filters.minBuildYear) params.min_build_year = filters.minBuildYear;
        if (filters.maxBuildYear) params.max_build_year = filters.maxBuildYear;
        if (filters.city) params.city = filters.city;
        if (filters.areaFrom) params.min_area = filters.areaFrom;
        if (filters.areaTo) params.max_area = filters.areaTo;
        if (filters.isNew) params.is_new = filters.isNew;
        if (filters.search) params.search = filters.search;
      }

      const response = await api.get(url, { params });
      let data = response.data as Property[];

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

  const handleLikeToggle = (propertyId: string, isLiked: boolean) => {
    setProperties(prev => 
      prev.map(p => p.id === propertyId ? { 
        ...p, 
        is_liked_by_me: isLiked,
        likes_count: isLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1)
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
            placeholder="Search by title or address..."
            className="catalog-search__input"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
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
                placeholder="Min Area"
                className="catalog-filters__input"
                value={filters.areaFrom}
                onChange={(e) => activeTab === 'all' && handleFilterChange('areaFrom', e.target.value)}
                disabled={activeTab !== 'all'}
              />
              <input
                type="number"
                placeholder="Max Area"
                className="catalog-filters__input"
                value={filters.areaTo}
                onChange={(e) => activeTab === 'all' && handleFilterChange('areaTo', e.target.value)}
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
                {meta.property_types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                className="catalog-filters__input"
                value={filters.propertyPurpose}
                onChange={(e) => activeTab === 'all' && handleFilterChange('propertyPurpose', e.target.value)}
                disabled={activeTab !== 'all'}
              >
                <option value="">Any purpose</option>
                <option value="sale">Sale</option>
                <option value="rent">Rent</option>
              </select>
              <select
                className="catalog-filters__input"
                value={filters.city}
                onChange={(e) => activeTab === 'all' && handleFilterChange('city', e.target.value)}
                disabled={activeTab !== 'all'}
              >
                <option value="">Any city</option>
                {meta.cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                className="catalog-filters__input"
                value={filters.isNew}
                onChange={(e) => activeTab === 'all' && handleFilterChange('isNew', e.target.value)}
                disabled={activeTab !== 'all'}
              >
                <option value="">Any building type</option>
                <option value="новостройка">New building</option>
                <option value="вторичка">Secondary</option>
              </select>
            </div>

            <details className="catalog-filters__more">
              <summary className="catalog-filters__more-toggle">More filters</summary>
              <div className="catalog-filters__more-grid">
                <select
                  className="catalog-filters__input"
                  value={filters.material}
                  onChange={(e) => activeTab === 'all' && handleFilterChange('material', e.target.value)}
                  disabled={activeTab !== 'all'}
                >
                  <option value="">Any material</option>
                  {meta.materials.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  className="catalog-filters__input"
                  value={filters.repairType}
                  onChange={(e) => activeTab === 'all' && handleFilterChange('repairType', e.target.value)}
                  disabled={activeTab !== 'all'}
                >
                  <option value="">Any repair</option>
                  {meta.repair_types.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input
                  type="number"
                  placeholder="Min Year"
                  className="catalog-filters__input"
                  value={filters.minBuildYear}
                  onChange={(e) => activeTab === 'all' && handleFilterChange('minBuildYear', e.target.value)}
                  disabled={activeTab !== 'all'}
                />
                <input
                  type="number"
                  placeholder="Max Year"
                  className="catalog-filters__input"
                  value={filters.maxBuildYear}
                  onChange={(e) => activeTab === 'all' && handleFilterChange('maxBuildYear', e.target.value)}
                  disabled={activeTab !== 'all'}
                />
              </div>
            </details>

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
          {(activeTab === 'all' && filteredAiRecs.length > 0 ? [
            ...filteredAiRecs.map(r => {
              const updated = properties.find(p => p.id === r.id);
              return { ...r, ...updated, is_ai_recommendation: true, id: r.id };
            }),
            ...properties.filter(p => !filteredAiRecs.some(ai => ai.id === p.id))
          ] : properties).map((prop, index) => (
             <PropertyCard 
               key={`${activeTab}-${prop.id}-${index}`} 
               property={prop} 
               showActions={true} 
               onLikeToggle={(propertyId, isLiked) => handleLikeToggle(propertyId, isLiked)}
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
