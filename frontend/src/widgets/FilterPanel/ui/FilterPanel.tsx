import React, { memo, useState } from 'react';
import type { FilterValues } from '@shared/utils/filterParams';
import RangeSlider from '@shared/ui/RangeSlider';
import CheckboxGroup from '@shared/ui/CheckboxGroup';
import './FilterPanel.scss';

export interface FilterPanelMeta {
  cities: string[];
  materials: string[];
  repair_types: string[];
  property_types: string[];
}

interface FilterPanelProps {
  filters: FilterValues;
  meta: FilterPanelMeta;
  showActions?: boolean;
  onFilterChange: (key: keyof FilterValues, value: unknown) => void;
  onApply: () => void;
  onReset: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  meta,
  showActions = true,
  onFilterChange,
  onApply,
  onReset,
}) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  return (
    <div className="filter-panel">
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
            value={filters.priceRange}
            onChange={(v) => onFilterChange('priceRange', v)}
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
            selected={filters.rooms.map(String)}
            onChange={(v) => onFilterChange('rooms', v.map(Number))}
          />

          <CheckboxGroup
            label="Property type"
            options={meta.property_types.map(t => ({ label: t, value: t }))}
            selected={filters.propertyTypes}
            onChange={(v) => onFilterChange('propertyTypes', v)}
          />

          <CheckboxGroup
            label="Purpose"
            options={[
              { label: 'Sale', value: 'sale' },
              { label: 'Rent', value: 'rent' },
              { label: 'Daily rent', value: 'daily_rent' },
            ]}
            selected={filters.propertyPurposes}
            onChange={(v) => onFilterChange('propertyPurposes', v)}
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
            selected={filters.cities}
            onChange={(v) => onFilterChange('cities', v)}
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
            value={filters.areaRange}
            onChange={(v) => onFilterChange('areaRange', v)}
            formatLabel={(v) => `${v} m²`}
          />

          <RangeSlider
            label="Build year"
            min={1960}
            max={2025}
            step={1}
            value={filters.buildYearRange}
            onChange={(v) => onFilterChange('buildYearRange', v)}
          />

          <CheckboxGroup
            label="Material"
            options={meta.materials.map(m => ({ label: m, value: m }))}
            selected={filters.materials}
            onChange={(v) => onFilterChange('materials', v)}
          />

          <CheckboxGroup
            label="Repair type"
            options={meta.repair_types.map(r => ({ label: r, value: r }))}
            selected={filters.repairTypes}
            onChange={(v) => onFilterChange('repairTypes', v)}
          />

          <CheckboxGroup
            label="Building type"
            options={[
              { label: 'New building', value: 'new building' },
              { label: 'Secondary', value: 'secondary' },
              { label: 'Under construction', value: 'under construction' },
            ]}
            selected={filters.isNew}
            onChange={(v) => onFilterChange('isNew', v)}
          />
        </div>
      </div>

      {showActions && (
        <div className="filter-panel__actions">
          <button className="filter-panel__reset-btn" onClick={onReset}>Reset</button>
          <button className="filter-panel__apply-btn" onClick={onApply}>Apply Filters</button>
        </div>
      )}
    </div>
  );
};

export default memo(FilterPanel);
