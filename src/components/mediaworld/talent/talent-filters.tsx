'use client';

import Link from 'next/link';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { ALL_DISTRICTS, DISTRICTS_BY_DIVISION, DIVISIONS } from '@/lib/constants';
import { nodeName, type LocalizedText } from '@/lib/mediaworld/labels';
import type { TalentBrowseInput } from '@/lib/mediaworld/talent-browse';
import type { TaxonomySnapshot } from '@/lib/mediaworld/taxonomy';

type Props = {
  filters: TalentBrowseInput;
  industries: TaxonomySnapshot['industries'];
};

export const TALENT_SORT_LABELS = {
  recent: { bn: 'নতুন আগে', en: 'Newest first' },
  name: { bn: 'নাম (অ–হ)', en: 'Name (A–Z)' },
} satisfies Record<TalentBrowseInput['sort'], LocalizedText>;

/** A plain GET form: filtered browse URLs stay shareable and work without JavaScript. */
export default function TalentFilters({ filters, industries }: Props) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const districts: readonly string[] = filters.division
    ? (DISTRICTS_BY_DIVISION as Record<string, readonly string[]>)[filters.division] ?? ALL_DISTRICTS
    : ALL_DISTRICTS;

  const categories = industries.flatMap((industry) => industry.categories.map((category) => ({ ...category, parent: industry })));
  const scopedCategories = filters.industryId ? categories.filter((category) => category.parent.id === filters.industryId) : categories;
  const designations = Array.from(
    new Map(
      scopedCategories
        .filter((category) => !filters.mainCategoryId || category.id === filters.mainCategoryId)
        .flatMap((category) => category.designations)
        .map((designation) => [designation.id, designation]),
    ).values(),
  );

  return (
    <form className='mw-talent-filters' method='get' action='/mediaworld/talent' aria-label={bn ? 'প্রতিভা খোঁজার ফিল্টার' : 'Talent filters'}>
      <div className='mw-talent-field wide'>
        <label htmlFor='mw-talent-q'>{bn ? 'খুঁজুন' : 'Search'}</label>
        <input
          id='mw-talent-q'
          name='q'
          defaultValue={filters.query ?? ''}
          maxLength={120}
          placeholder={bn ? 'অভিনেতা, ক্যামেরাম্যান, এডিটর…' : 'Actor, cameraman, editor…'}
        />
      </div>
      <div className='mw-talent-field'>
        <label htmlFor='mw-talent-industry'>{bn ? 'ইন্ডাস্ট্রি' : 'Industry'}</label>
        <select id='mw-talent-industry' name='industryId' defaultValue={filters.industryId ?? ''}>
          <option value=''>{bn ? 'সব ইন্ডাস্ট্রি' : 'All industries'}</option>
          {industries.map((industry) => (
            <option key={industry.id} value={industry.id}>{nodeName(industry, bn)}</option>
          ))}
        </select>
      </div>
      <div className='mw-talent-field'>
        <label htmlFor='mw-talent-category'>{bn ? 'মূল ক্যাটাগরি' : 'Main category'}</label>
        <select id='mw-talent-category' name='mainCategoryId' defaultValue={filters.mainCategoryId ?? ''}>
          <option value=''>{bn ? 'সব ক্যাটাগরি' : 'All categories'}</option>
          {scopedCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {filters.industryId ? nodeName(category, bn) : `${nodeName(category.parent, bn)} — ${nodeName(category, bn)}`}
            </option>
          ))}
        </select>
      </div>
      <div className='mw-talent-field'>
        <label htmlFor='mw-talent-designation'>{bn ? 'পদ' : 'Designation'}</label>
        <select id='mw-talent-designation' name='designationId' defaultValue={filters.designationId ?? ''}>
          <option value=''>{bn ? 'সব পদ' : 'All designations'}</option>
          {designations.map((designation) => (
            <option key={designation.id} value={designation.id}>{nodeName(designation, bn)}</option>
          ))}
        </select>
      </div>
      <div className='mw-talent-field'>
        <label htmlFor='mw-talent-division'>{bn ? 'বিভাগ' : 'Division'}</label>
        <select id='mw-talent-division' name='division' defaultValue={filters.division ?? ''}>
          <option value=''>{bn ? 'সব বিভাগ' : 'All divisions'}</option>
          {DIVISIONS.map((division) => <option key={division} value={division}>{division}</option>)}
        </select>
      </div>
      <div className='mw-talent-field'>
        <label htmlFor='mw-talent-district'>{bn ? 'জেলা' : 'District'}</label>
        <select id='mw-talent-district' name='district' defaultValue={filters.district ?? ''}>
          <option value=''>{bn ? 'সব জেলা' : 'All districts'}</option>
          {districts.map((district) => <option key={district} value={district}>{district}</option>)}
        </select>
      </div>
      <div className='mw-talent-field'>
        <label htmlFor='mw-talent-sort'>{bn ? 'সাজান' : 'Sort'}</label>
        <select id='mw-talent-sort' name='sort' defaultValue={filters.sort}>
          {Object.entries(TALENT_SORT_LABELS).map(([value, labels]) => (
            <option key={value} value={value}>{labels[bn ? 'bn' : 'en']}</option>
          ))}
        </select>
      </div>
      <div className='mw-talent-field actions'>
        <button className='mw-talent-apply' type='submit'>{bn ? 'ফিল্টার করুন' : 'Apply filters'}</button>
        <Link className='mw-talent-reset' href='/mediaworld/talent'>{bn ? 'রিসেট' : 'Reset'}</Link>
      </div>
    </form>
  );
}
