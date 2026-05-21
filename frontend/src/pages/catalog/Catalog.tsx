import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Catalog.scss'
import { useAppSelector } from '@app/store/hooks';
import PropertyCard from '@entities/property/ui/PropertyCard';
import type { Property } from '@shared/api/types';
import { propertyService } from '@shared/api/properties.service';
import { recommendationsService } from '@shared/api/recommendations.service';
import api from '@shared/api/api';
import RangeSlider from '@shared/ui/RangeSlider';
import CheckboxGroup from '@shared/ui/CheckboxGroup';
import { parseFilters, parseSearch, filtersToSearchParams } from '@shared/utils/filterParams';
import type { FilterValues } from '@shared/utils/filterParams';

type TabType = 'all' | 'viewed' | 'liked';

type CatalogFilters = FilterValues;

const defaultFilters: CatalogFilters = {
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

const CATALOG_PAGE_SIZE = 12;

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
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  const urlFilters = useMemo(() => parseFilters(searchParams, defaultFilters), [searchParams]);
  const urlSearch = useMemo(() => parseSearch(searchParams), [searchParams]);

  const filteredAiRecs = useMemo(() => {
    if (activeTab !== 'all' || !aiRecs.length) return [];
    return aiRecs.filter(p => {
      const df = draftFilters;
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

  const buildParams = (f: CatalogFilters, search: string, pageNum: number) => {
    const params: Record<string, unknown> = {
      limit: CATALOG_PAGE_SIZE,
      offset: (pageNum - 1) * CATALOG_PAGE_SIZE,
    };
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
    if (search) params.search = search;
    return params;
  };

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
    setOpenSections(new Set());
  };

  const resetFilters = () => {
    setDraftFilters(defaultFilters);
    setSearchQuery('');
    setSearchParams(filtersToSearchParams(defaultFilters, '', defaultFilters));
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
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

  return (
    <div className="catalog-page">
      <aside className="catalog-sidebar">
        <div className="catalog-search">
          <input
            type="text"
            placeholder="Search by title or address..."
            className="catalog-search__input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="catalog-filters">
          <h3 className="catalog-filters__title">Filters</h3>

          <div className="filter-section filter-section--open">
            <div className="filter-section__header" onClick={() => toggleSection('main')}>
              <span>Main</span>
              <span className="filter-section__arrow">{openSections.has('main') ? '▼' : '▶'}</span>
            </div>
            <div className="filter-section__body">

            <RangeSlider
              label="Price"
              min={0}
              max={50000000}
              step={100000}
              value={draftFilters.priceRange}
              onChange={(v) => handleDraftChange('priceRange', v)}
              formatLabel={(v) => `${(v / 1000000).toFixed(1)}M ₽`}
            />

            <CheckboxGroup
              label="Rooms"
              options={[
                { label: '1', value: '1' },
                { label: '2', value: '2' },
                { label: '3', value: '3' },
                { label: '4+', value: '4' },
              ]}
              selected={draftFilters.rooms.map(String)}
              onChange={(v) => handleDraftChange('rooms', v.map(Number))}
            />

            <CheckboxGroup
              label="Property type"
              options={meta.property_types.map(t => ({ label: t, value: t }))}
              selected={draftFilters.propertyTypes}
              onChange={(v) => handleDraftChange('propertyTypes', v)}
            />

            <CheckboxGroup
              label="Purpose"
              options={[
                { label: 'Sale', value: 'sale' },
                { label: 'Rent', value: 'rent' },
                { label: 'Daily rent', value: 'daily_rent' },
              ]}
              selected={draftFilters.propertyPurposes}
              onChange={(v) => handleDraftChange('propertyPurposes', v)}
            />

            </div>
          </div>

          <div className={`filter-section ${openSections.has('location') ? 'filter-section--open' : ''}`}>
            <div className="filter-section__header" onClick={() => toggleSection('location')}>
              <span>Location</span>
              <span className="filter-section__arrow">{openSections.has('location') ? '▼' : '▶'}</span>
            </div>
            <div className="filter-section__body">

            <CheckboxGroup
              label="City"
              options={meta.cities.map(c => ({ label: c, value: c }))}
              selected={draftFilters.cities}
              onChange={(v) => handleDraftChange('cities', v)}
            />

            </div>
          </div>

          <div className={`filter-section ${openSections.has('details') ? 'filter-section--open' : ''}`}>
            <div className="filter-section__header" onClick={() => toggleSection('details')}>
              <span>Details</span>
              <span className="filter-section__arrow">{openSections.has('details') ? '▼' : '▶'}</span>
            </div>
            <div className="filter-section__body">

            <RangeSlider
              label="Area (m²)"
              min={0}
              max={300}
              step={5}
              value={draftFilters.areaRange}
              onChange={(v) => handleDraftChange('areaRange', v)}
              formatLabel={(v) => `${v} m²`}
            />

            <RangeSlider
              label="Build year"
              min={1960}
              max={2025}
              step={1}
              value={draftFilters.buildYearRange}
              onChange={(v) => handleDraftChange('buildYearRange', v)}
            />

            <CheckboxGroup
              label="Material"
              options={meta.materials.map(m => ({ label: m, value: m }))}
              selected={draftFilters.materials}
              onChange={(v) => handleDraftChange('materials', v)}
            />

            <CheckboxGroup
              label="Repair type"
              options={meta.repair_types.map(r => ({ label: r, value: r }))}
              selected={draftFilters.repairTypes}
              onChange={(v) => handleDraftChange('repairTypes', v)}
            />

            <CheckboxGroup
              label="Building type"
              options={[
                { label: 'New building', value: 'new building' },
                { label: 'Secondary', value: 'secondary' },
                { label: 'Under construction', value: 'under construction' },
              ]}
              selected={draftFilters.isNew}
              onChange={(v) => handleDraftChange('isNew', v)}
            />

            </div>
          </div>

          {activeTab === 'all' && (
            <div className="catalog-filters__actions">
              <button className="catalog-filters__reset-btn" onClick={resetFilters}>
                Reset
              </button>
              <button className="catalog-filters__apply-btn" onClick={applyFilters}>
                Apply Filters
              </button>
            </div>
          )}
        </div>


        <div className="catalog-tabs">
          <button
            className={`catalog-tab ${activeTab === 'all' ? 'catalog-tab--active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          {isAuthenticated && (
            <button
              className={`catalog-tab ${activeTab === 'viewed' ? 'catalog-tab--active' : ''}`}
              onClick={() => setActiveTab('viewed')}
            >
              Viewed
            </button>
          )}
          {isAuthenticated && (
            <button
              className={`catalog-tab ${activeTab === 'liked' ? 'catalog-tab--active' : ''}`}
              onClick={() => setActiveTab('liked')}
            >
              Liked
            </button>
          )}
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
               isAuthenticated={isAuthenticated}
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
