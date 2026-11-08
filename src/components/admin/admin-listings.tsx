'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertBanner,
  BTN,
  ConfirmButton,
  EmptyState,
  INPUT,
  MUTED,
  NOTE,
  Pill,
  ROW,
  SECTION,
  TITLE,
  formatDate,
  load,
  mutate,
  type Banner,
} from './admin-ui';
import type { RentalAvailabilityValue, RentalPriceUnit } from '@/lib/mediaworld/rental';
import { formatRentalAvailability, formatRentalPrice } from '@/lib/mediaworld/labels';

type AdminListing = {
  id: string;
  title: string;
  description: string;
  pricePaisa: number;
  priceUnit: RentalPriceUnit;
  priceCustom: string | null;
  location: string;
  availability: RentalAvailabilityValue;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: { id: string; nameEn: string };
  subcategory: { id: string; nameEn: string } | null;
  provider: { id: string; businessName: string | null; ownerName: string };
  photos: { id: string; url: string }[];
  _count: { inquiries: number; reports: number };
};

const FILTERS = [
  { key: 'view', label: 'Status', options: [
    { value: 'ALL', label: 'All listings' },
    { value: 'ACTIVE', label: 'Visible only' },
    { value: 'HIDDEN', label: 'Hidden only' },
  ] },
  { key: 'availability', label: 'Availability', options: [
    { value: '', label: 'Any availability' },
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'UNAVAILABLE', label: 'Unavailable' },
    { value: 'TEMPORARILY_UNAVAILABLE', label: 'Temporarily unavailable' },
  ] },
];

export default function AdminListings() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('ALL');
  const [availability, setAvailability] = useState('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      setBanner(null);
      const params = new URLSearchParams({ view, limit: '30' });
      if (availability) params.set('availability', availability);
      if (appliedQuery) params.set('q', appliedQuery);
      if (cursor) params.set('cursor', cursor);

      const result = await load(`/api/mediaworld/admin/listings?${params.toString()}`, 'Unable to load the rental listings queue.');
      setLoading(false);
      if (!result.ok) {
        setBanner({ tone: 'error', text: result.message });
        return;
      }
      const page = (result.json?.listings ?? []) as AdminListing[];
      setListings((current) => (append ? [...current, ...page] : page));
      setNextCursor((result.json?.nextCursor as string | null) ?? null);
    },
    [appliedQuery, availability, view],
  );

  useEffect(() => {
    void fetchPage(null, false);
  }, [fetchPage]);

  async function act(listing: AdminListing, action: 'hide' | 'restore') {
    setBanner(null);
    const result = await mutate(`/api/mediaworld/admin/listings/${listing.id}`, 'PATCH', { action }, `Unable to ${action} this listing.`);
    if (!result.ok) {
      setBanner({ tone: 'error', text: result.message });
      return;
    }
    setListings((current) => current.map((item) => (item.id === listing.id ? { ...item, isActive: action === 'restore' } : item)));
    setBanner({ tone: 'ok', text: action === 'hide' ? `Hidden "${listing.title}". It no longer appears in the For Rent market.` : `Restored "${listing.title}" to the For Rent market.` });
  }

  return (
    <section style={SECTION}>
      <h2 style={TITLE}>Rental listings</h2>
      <p style={NOTE}>
        Moderation queue across every provider. Admins hide or restore listings here — a listing is never deleted from the admin panel,
        because the provider&apos;s own manage page and its inquiry history must stay intact.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        {FILTERS.map((filter) => (
          <select
            key={filter.key}
            aria-label={filter.label}
            style={{ ...INPUT, width: 'auto', minWidth: 180 }}
            value={filter.key === 'view' ? view : availability}
            onChange={(event) => (filter.key === 'view' ? setView(event.target.value) : setAvailability(event.target.value))}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}
        <input
          style={{ ...INPUT, width: 200 }}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title or location"
          aria-label="Search listings"
        />
        <button type="button" style={BTN} onClick={() => setAppliedQuery(query.trim())}>
          Apply search
        </button>
        {appliedQuery ? (
          <button
            type="button"
            style={BTN}
            onClick={() => {
              setQuery('');
              setAppliedQuery('');
            }}
          >
            Clear search
          </button>
        ) : null}
        {appliedQuery ? <span style={MUTED}>Filtering by “{appliedQuery}”.</span> : null}
      </div>

      <AlertBanner banner={banner} />
      {loading ? <p style={MUTED}>Loading listings…</p> : null}
      {!loading && listings.length === 0 ? <EmptyState title="No listings match these filters." note="Try “All listings”, or clear the search box." /> : null}

      {!loading
        ? listings.map((listing) => (
            <div key={listing.id} style={ROW}>
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Link href={`/for-rent/${listing.id}`} style={{ color: '#bfdbfe', fontSize: '0.9rem', fontWeight: 700 }}>
                    {listing.title}
                  </Link>
                  <Pill tone={listing.isActive ? 'ok' : 'bad'}>{listing.isActive ? 'Visible' : 'Hidden'}</Pill>
                  <Pill tone="plain">{formatRentalAvailability(listing.availability, false)}</Pill>
                  {listing._count.reports > 0 ? <Pill tone="warn">{listing._count.reports} report(s)</Pill> : null}
                </div>
                <span style={MUTED}>
                  {formatRentalPrice(listing.pricePaisa, listing.priceUnit, listing.priceCustom, false)} · {listing.location} ·{' '}
                  {listing.category.nameEn}
                  {listing.subcategory ? ` / ${listing.subcategory.nameEn}` : ''}
                </span>
                <span style={MUTED}>
                  Provider: {listing.provider.businessName ?? listing.provider.ownerName} · {listing._count.inquiries} inquiries · listed{' '}
                  {formatDate(listing.createdAt)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {listing.photos[0]?.url ? <img src={listing.photos[0].url} alt="" style={{ width: 62, height: 46, objectFit: 'cover', borderRadius: 8 }} /> : null}
                <span style={MUTED}>Last updated {formatDate(listing.updatedAt)}</span>
                {listing.isActive ? (
                  <ConfirmButton label="Hide listing" confirmLabel="Confirm hide" tone="danger" onConfirm={() => act(listing, 'hide')} />
                ) : (
                  <ConfirmButton label="Restore" confirmLabel="Confirm restore" onConfirm={() => act(listing, 'restore')} />
                )}
              </div>
            </div>
          ))
        : null}

      {!loading && nextCursor ? (
        <button type="button" style={INPUT} onClick={() => void fetchPage(nextCursor, true)}>
          Load more listings
        </button>
      ) : null}
    </section>
  );
}
