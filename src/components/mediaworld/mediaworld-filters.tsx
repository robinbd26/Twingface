'use client';

import { useMemo, useState } from 'react';
import { DISTRICTS_BY_DIVISION, MEDIA_WORLD_SERVICE_CATEGORIES, MEDIA_WORLD_CATEGORY_LABELS, MEDIAWORLD_DIVISIONS } from '@/lib/mediaworld';

export type MediaWorldFilters = {
  query: string;
  category: string;
  division: string;
  district: string;
};

const CATEGORIES = MEDIA_WORLD_SERVICE_CATEGORIES;

export default function MediaWorldFiltersBar({
  filters,
  onFilter,
}: {
  filters: MediaWorldFilters;
  onFilter: (next: MediaWorldFilters) => void;
}) {
  const [division, setDivision] = useState(filters.division);
  const [district, setDistrict] = useState(filters.district);
  const [category, setCategory] = useState(filters.category);
  const [query, setQuery] = useState(filters.query);

  const divisions = useMemo(() => [...MEDIAWORLD_DIVISIONS], []);

  const districts = useMemo(() => {
    if (!division) return [] as string[];
    return [...(DISTRICTS_BY_DIVISION[division as keyof typeof DISTRICTS_BY_DIVISION] ?? [])];
  }, [division]);

  const reset = () => {
    setDivision('');
    setDistrict('');
    setCategory('');
    setQuery('');
    onFilter({ query: '', category: '', division: '', district: '' });
  };

  return (
    <div className="fb-card surface" data-testid="mediaworld-filters">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="mw-query" className="sr-only">Search MediaWorld</label>
          <input
            id="mw-query"
            type="search"
            className="w-full rounded-xl border-0 bg-[#1e1f22] px-4 py-3 text-sm text-[#e4e6eb] placeholder:text-[#6b7076] focus:outline-none focus:ring-2 focus:ring-[#2d88ff]/40"
            placeholder="Search names, roles, equipment, village..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-[200px]">
          <label htmlFor="mw-division" className="sr-only">Division</label>
          <select
            id="mw-division"
            className="w-full rounded-xl border-0 bg-[#1e1f22] px-4 py-3 text-sm text-[#e4e6eb] focus:outline-none focus:ring-2 focus:ring-[#2d88ff]/40"
            value={division}
            onChange={(e) => {
              setDivision(e.target.value);
              setDistrict('');
              onFilter({ query, category, division: e.target.value, district: '' });
            }}
          >
            <option value="">All Divisions</option>
            {divisions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="w-[200px]">
          <label htmlFor="mw-district" className="sr-only">District</label>
          <select
            id="mw-district"
            className="w-full rounded-xl border-0 bg-[#1e1f22] px-4 py-3 text-sm text-[#e4e6eb] focus:outline-none focus:ring-2 focus:ring-[#2d88ff]/40"
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              onFilter({ query, category, division, district: e.target.value });
            }}
          >
            <option value="">All Districts</option>
            {districts.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="w-[200px]">
          <label htmlFor="mw-category" className="sr-only">Category</label>
          <select
            id="mw-category"
            className="w-full rounded-xl border-0 bg-[#1e1f22] px-4 py-3 text-sm text-[#e4e6eb] focus:outline-none focus:ring-2 focus:ring-[#2d88ff]/40"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>{MEDIA_WORLD_CATEGORY_LABELS[item]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="button" className="fb-btn fb-btn-secondary" onClick={reset} aria-label="Reset filters">Reset</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-[#b0b3b8] mt-3">
        <span className="font-medium text-[#d6dae0]">{division || 'All Divisions'}</span>
        <span className="font-medium text-[#d6dae0]">{district || 'All Districts'}</span>
        <span className="font-medium text-[#d6dae0]">{category || 'All Categories'}</span>
      </div>
    </div>
  );
}
