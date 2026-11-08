'use client';

import Link from 'next/link';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { ALL_DISTRICTS, DISTRICTS_BY_DIVISION, DIVISIONS } from '@/lib/constants';
import { AVAILABILITY_LABELS, BROWSE_SORT_LABELS, nodeName } from '@/lib/mediaworld/labels';
import { RENTAL_AVAILABILITY_VALUES, type RentalBrowseInput } from '@/lib/mediaworld/rental';
import type { TaxonomySnapshot } from '@/lib/mediaworld/taxonomy';

type Props = {
  filters: RentalBrowseInput;
  rentalCategories: TaxonomySnapshot['rentalCategories'];
};

/** A plain GET form: filtered browse URLs stay shareable and work without JavaScript. */
export default function ForRentFilters({ filters, rentalCategories }: Props) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const hasCategory = Boolean(filters.categoryId);
  const districts: readonly string[] = filters.division
    ? (DISTRICTS_BY_DIVISION as Record<string, readonly string[]>)[filters.division] ?? ALL_DISTRICTS
    : ALL_DISTRICTS;
  const subcategories = rentalCategories
    .filter((category) => !hasCategory || category.id === filters.categoryId)
    .flatMap((category) => category.subcategories.map((sub) => ({ ...sub, parent: category })));

  return (
    <form className='mw-rent-filters' method='get' action='/for-rent' aria-label={bn ? 'ফিল্টার' : 'Rental filters'}>
      <div className='mw-rent-field wide'>
        <label htmlFor='mw-rent-q'>{bn ? 'খুঁজুন' : 'Search'}</label>
        <input id='mw-rent-q' name='q' defaultValue={filters.query ?? ''} maxLength={120} placeholder={bn ? 'ক্যামেরা, লাইট, গাড়ি…' : 'Camera, lights, vehicle…'} />
      </div>
      <div className='mw-rent-field'>
        <label htmlFor='mw-rent-category'>{bn ? 'ক্যাটাগরি' : 'Category'}</label>
        <select id='mw-rent-category' name='categoryId' defaultValue={filters.categoryId ?? ''}>
          <option value=''>{bn ? 'সব ক্যাটাগরি' : 'All categories'}</option>
          {rentalCategories.map((category) => (
            <option key={category.id} value={category.id}>{nodeName(category, bn)}</option>
          ))}
        </select>
      </div>
      <div className='mw-rent-field'>
        <label htmlFor='mw-rent-subcategory'>{bn ? 'সাব-ক্যাটাগরি' : 'Subcategory'}</label>
        <select id='mw-rent-subcategory' name='subcategoryId' defaultValue={filters.subcategoryId ?? ''}>
          <option value=''>{bn ? 'সব সাব-ক্যাটাগরি' : 'All subcategories'}</option>
          {subcategories.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {hasCategory ? nodeName(sub, bn) : `${nodeName(sub.parent, bn)} — ${nodeName(sub, bn)}`}
            </option>
          ))}
        </select>
      </div>
      <div className='mw-rent-field'>
        <label htmlFor='mw-rent-division'>{bn ? 'বিভাগ' : 'Division'}</label>
        <select id='mw-rent-division' name='division' defaultValue={filters.division ?? ''}>
          <option value=''>{bn ? 'সব বিভাগ' : 'All divisions'}</option>
          {DIVISIONS.map((division) => <option key={division} value={division}>{division}</option>)}
        </select>
      </div>
      <div className='mw-rent-field'>
        <label htmlFor='mw-rent-district'>{bn ? 'জেলা' : 'District'}</label>
        <select id='mw-rent-district' name='district' defaultValue={filters.district ?? ''}>
          <option value=''>{bn ? 'সব জেলা' : 'All districts'}</option>
          {districts.map((district) => <option key={district} value={district}>{district}</option>)}
        </select>
      </div>
      <div className='mw-rent-field'>
        <label htmlFor='mw-rent-price'>{bn ? 'সর্বোচ্চ দাম (৳)' : 'Max price (৳)'}</label>
        <input
          id='mw-rent-price'
          name='maxPriceTaka'
          type='number'
          min={0}
          step={100}
          defaultValue={filters.maxPricePaisa === undefined ? '' : filters.maxPricePaisa / 100}
          placeholder={bn ? 'যেমন ৫০০০' : 'e.g. 5000'}
        />
      </div>
      <div className='mw-rent-field'>
        <label htmlFor='mw-rent-availability'>{bn ? 'উপলব্ধতা' : 'Availability'}</label>
        <select id='mw-rent-availability' name='availability' defaultValue={filters.availability ?? ''}>
          <option value=''>{bn ? 'শুধু উপলব্ধ' : 'Available only'}</option>
          {RENTAL_AVAILABILITY_VALUES.map((value) => (
            <option key={value} value={value}>{AVAILABILITY_LABELS[value][bn ? 'bn' : 'en']}</option>
          ))}
        </select>
      </div>
      <div className='mw-rent-field'>
        <label htmlFor='mw-rent-sort'>{bn ? 'সাজান' : 'Sort'}</label>
        <select id='mw-rent-sort' name='sort' defaultValue={filters.sort}>
          {Object.entries(BROWSE_SORT_LABELS).map(([value, labels]) => (
            <option key={value} value={value}>{labels[bn ? 'bn' : 'en']}</option>
          ))}
        </select>
      </div>
      <div className='mw-rent-field actions'>
        <button className='mw-rent-apply' type='submit'>{bn ? 'ফিল্টার করুন' : 'Apply filters'}</button>
        <Link className='mw-rent-reset' href='/for-rent'>{bn ? 'রিসেট' : 'Reset'}</Link>
      </div>
    </form>
  );
}
