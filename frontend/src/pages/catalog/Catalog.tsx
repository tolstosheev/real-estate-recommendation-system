import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Catalog.scss'
import { useAppSelector } from '@app/store/hooks';
import type { Property } from '@shared/api/types';
import { propertyService } from '@shared/api/properties.service';
import { recommendationsService } from '@shared/api/recommendations.service';
import api from '@shared/api/api';
import FilterPanel from '@widgets/FilterPanel';
import { parseFilters, parseSearch, filtersToSearchParams } from '@shared/utils/filterParams';
import type { FilterValues } from '@shared/utils/filterParams';
import { TabBar, SearchBar, PropertyGrid } from './ui';
import type { TabType } from './ui';
import { buildParams, defaultFilters, CATALOG_PAGE_SIZE } from './utils';

type CatalogFilters = FilterValues;

const Catalog: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [aiRecs, setAiRecs] = useState<Property[]>([]);
  const [recVersion, setRecVersion] = useState(0);
  const [draftFilters, setDraftFilters] = useState<CatalogFilters>(() =>
    parseFilters(new URLSearchParams(window.location.search), defaultFilters)
  );
  const [searchQuery, setSearchQuery] = useState(() =>
    new URLSearchParams(window.location.search).get('search') || ''
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  const urlFilters = useMemo(() => parseFilters(searchParams, defaultFilters), [searchParams]);
  const urlSearch = useMemo(() => parseSearch(searchParams), [searchParams]);

  const filteredAiRecs = useMemo(() => {
    if (activeTab !== 'all' || !aiRecs.length) return [];
    return aiRecs.filter(p => {
      const df = urlFilters;
      if (df.cities.length && (!p.city || !df.cities.includes(p.city))) return false;
      if (df.propertyTypes.length && (!p.property_type || !df.propertyTypes.includes(p.property_type))) return false;
      if (df.propertyPurposes.length && (!p.property_purpose || !df.propertyPurposes.includes(p.property_purpose))) return false;
      if (df.isNew.length && (!p.is_new || !df.isNew.includes(p.is_new))) return false;
      if (df.materials.length && (!p.material || !df.materials.includes(p.material))) return false;
      if (df.repairTypes.length && (!p.repair_type || !df.repairTypes.includes(p.repair_type))) return false;
      if (df.priceRange[0] > 0 && (!p.price || p.price < df.priceRange[0])) return false;
      if (df.priceRange[1] < 50000000 && (!p.price || p.price > df.priceRange[1])) return false;
      if (df.rooms.length && (!p.rooms || !df.rooms.includes(p.rooms))) return false;
      if (df.areaRange[0] > 0 && (!p.area || p.area < df.areaRange[0])) return false;
      if (df.areaRange[1] < 300 && (!p.area || p.area > df.areaRange[1])) return false;
      if (df.buildYearRange[0] > 1960 && (!p.build_year || p.build_year < df.buildYearRange[0])) return false;
      if (df.buildYearRange[1] < 2025 && (!p.build_year || p.build_year > df.buildYearRange[1])) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (p.title && !p.title.toLowerCase().includes(q) && p.address && !p.address.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [aiRecs, draftFilters, searchQuery, activeTab]);

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
  }, [isAuthenticated, activeTab, recVersion]);

  const fetchProperties = useCallback(async (tab: TabType, pageNum: number, isNewTab = false, filters?: CatalogFilters, search?: string) => {
    setIsLoading(true);
    try {
      let url = '/api/properties/';

      if (tab === 'liked' && isAuthenticated) {
        url = '/api/interactions/favorites';
      } else if (tab === 'viewed' && isAuthenticated) {
        url = '/api/interactions/history';
      }

      const params = tab === 'all'
        ? buildParams(filters ?? defaultFilters, search ?? '', pageNum)
        : { limit: CATALOG_PAGE_SIZE, offset: (pageNum - 1) * CATALOG_PAGE_SIZE };

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
  }, [isAuthenticated]);

  useEffect(() => {
    setProperties([]);
    setPage(1);
    setHasMore(true);
    fetchProperties(activeTab, 1, true, urlFilters, urlSearch);
  }, [activeTab, fetchProperties, urlFilters, urlSearch]);

  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(isLoading);
  hasMoreRef.current = hasMore;
  isLoadingRef.current = isLoading;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !isLoadingRef.current) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 1.0 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore]);

  useEffect(() => {
    if (page > 1) {
      fetchProperties(activeTab, page, false, urlFilters, urlSearch);
    }
  }, [page, activeTab, fetchProperties, urlFilters, urlSearch]);

  // debounce search -> write to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (searchQuery) {
          next.set('search', searchQuery);
        } else {
          next.delete('search');
        }
        return next;
      }, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleDraftChange = (key: keyof CatalogFilters, value: unknown) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setSearchParams(filtersToSearchParams(draftFilters, searchQuery, defaultFilters));
  };

  const resetFilters = () => {
    setDraftFilters(defaultFilters);
    setSearchQuery('');
    setSearchParams(filtersToSearchParams(defaultFilters, '', defaultFilters));
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
    setRecVersion(v => v + 1);
  };

  const displayProperties = useMemo(() => {
    if (activeTab !== 'all' || !filteredAiRecs.length) return properties;
    return [
      ...filteredAiRecs.map(r => {
        const updated = properties.find(p => p.id === r.id);
        return { ...r, ...updated, is_ai_recommendation: true, id: r.id };
      }),
      ...properties.filter(p => !filteredAiRecs.some(ai => ai.id === p.id)),
    ];
  }, [properties, filteredAiRecs, activeTab]);

  return (
    <div className="catalog-page">
      <aside className="catalog-sidebar">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        <div className="catalog-filters">
          <h3 className="catalog-filters__title">Filters</h3>
          <FilterPanel
            filters={draftFilters}
            meta={meta}
            showActions={activeTab === 'all'}
            onFilterChange={handleDraftChange}
            onApply={applyFilters}
            onReset={resetFilters}
          />
        </div>

        <TabBar activeTab={activeTab} isAuthenticated={isAuthenticated} onTabChange={setActiveTab} />
      </aside>

      <main className="catalog-content">
        <PropertyGrid
          properties={displayProperties}
          isLoading={isLoading}
          hasMore={hasMore}
          activeTab={activeTab}
          isAuthenticated={isAuthenticated}
          loaderRef={loaderRef}
          onLikeToggle={handleLikeToggle}
        />
      </main>
    </div>
  );
};

export default Catalog;
