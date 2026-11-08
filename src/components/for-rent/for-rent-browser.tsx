'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MediaWorldLanguageToggle, useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { AVAILABILITY_LABELS } from '@/lib/mediaworld/labels';
import { rentalBrowseApiQuery } from '@/lib/mediaworld/rental-browse';
import type { RentalBrowseInput, RentalListingCard } from '@/lib/mediaworld/rental';
import type { TaxonomySnapshot } from '@/lib/mediaworld/taxonomy';
import ForRentCard from './for-rent-card';
import ForRentFilters from './for-rent-filters';

type Props = {
  filters: RentalBrowseInput;
  initialListings: RentalListingCard[];
  initialNextCursor: string | null;
  rentalCategories: TaxonomySnapshot['rentalCategories'];
  filtersIgnored: boolean;
};

export default function ForRentBrowser({ filters, initialListings, initialNextCursor, rentalCategories, filtersIgnored }: Props) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const [listings, setListings] = useState(initialListings);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const resultsHeading = filters.availability
    ? `${AVAILABILITY_LABELS[filters.availability][bn ? 'bn' : 'en']} — ${bn ? 'তালিকা' : 'listings'}`
    : (bn ? 'উপলব্ধ সরঞ্জাম' : 'Available equipment');

  async function loadMore() {
    if (!nextCursor) return;
    setLoading(true);
    setError('');
    try {
      const params = rentalBrowseApiQuery(filters);
      params.set('cursor', nextCursor);
      const response = await fetch(`/api/for-rent?${params}`);
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(bn ? 'আরও তালিকা লোড করা যায়নি।' : 'Unable to load more listings.');
        return;
      }
      setListings((current) => [...current, ...((body?.listings ?? []) as RentalListingCard[])]);
      setNextCursor((body?.nextCursor as string | null) ?? null);
    } catch {
      setError(bn ? 'নেটওয়ার্ক সমস্যা হয়েছে। সংযোগ পরীক্ষা করুন।' : 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className='mw-rent'>
      <header className='mw-rent-head'>
        <div>
          <p className='mw-rent-kicker'>{bn ? 'টুইংফেস মিডিয়া ওয়ার্ল্ড' : 'TwingFace Media World'}</p>
          <h1>{bn ? 'ভাড়া নিন' : 'For Rent'}</h1>
          <p className='mw-rent-lead'>
            {bn
              ? 'শুটিং হাউস, গাড়ি, ক্যামেরা, লাইট ও সব ধরনের প্রোডাকশন সরঞ্জাম ভাড়া নিন।'
              : 'Shooting houses, vehicles, cameras, lights and every kind of production equipment — ready to rent.'}
          </p>
        </div>
        <div className='mw-rent-head-actions'>
          <MediaWorldLanguageToggle />
          <nav className='mw-rent-links'>
            <Link href='/mediaworld' data-testid='for-rent-back-to-mediaworld'>{bn ? '← মিডিয়া ওয়ার্ল্ড' : '← Media World'}</Link>
            <Link href='/for-rent/new'>{bn ? '＋ সরঞ্জাম তালিকাভুক্ত করুন' : '＋ List your equipment'}</Link>
            <Link href='/for-rent/dashboard'>{bn ? 'ভাড়া ড্যাশবোর্ড' : 'Rental dashboard'}</Link>
            <Link href='/for-rent/bookings'>{bn ? 'আমার বুকিং' : 'My bookings'}</Link>
          </nav>
        </div>
      </header>

      <ForRentFilters filters={filters} rentalCategories={rentalCategories} />

      {filtersIgnored ? (
        <p className='mw-rent-notice'>
          {bn ? 'কিছু ফিল্টার বোঝা যায়নি; ডিফল্ট ফলাফল দেখানো হচ্ছে।' : 'Some filters could not be read, so default results are shown.'}
        </p>
      ) : null}

      <div className='mw-rent-results'>
        <h2>{resultsHeading}</h2>
        <p>{bn ? `${listings.length}টি তালিকা` : `${listings.length} listing${listings.length === 1 ? '' : 's'}`}</p>
      </div>

      {error ? <p className='mw-rent-error' role='alert'>{error}</p> : null}

      {listings.length ? (
        <>
          <div className='mw-rent-grid'>
            {listings.map((listing) => <ForRentCard key={listing.id} listing={listing} />)}
          </div>
          {nextCursor ? (
            <button className='mw-rent-more' type='button' onClick={() => void loadMore()} disabled={loading}>
              {loading ? (bn ? 'লোড হচ্ছে…' : 'Loading…') : bn ? 'আরও দেখুন' : 'Load more listings'}
            </button>
          ) : null}
        </>
      ) : (
        <div className='mw-rent-empty'>
          <span>📦</span>
          <strong>{bn ? 'কোনো তালিকা পাওয়া যায়নি' : 'No listings found'}</strong>
          <p>{bn ? 'অন্য ক্যাটাগরি, এলাকা বা খোঁজার শব্দ ব্যবহার করে দেখুন।' : 'Try a different category, area, or search term.'}</p>
          <Link href='/for-rent'>{bn ? 'সব ফিল্টার মুছুন' : 'Clear all filters'}</Link>
        </div>
      )}
    </section>
  );
}
