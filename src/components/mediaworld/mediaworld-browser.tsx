'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { MediaWorldDivisionGroup, MediaWorldListing } from '@/lib/mediaworld';
import MediaWorldListingCard from './mediaworld-listing-card';
import MediaWorldFiltersBar, { type MediaWorldFilters } from './mediaworld-filters';

export default function MediaWorldBrowser({
  initialListings,
  initialNextCursor,
  viewerId,
  divisions,
}: {
  initialListings: MediaWorldListing[];
  initialNextCursor: string | null;
  viewerId: string;
  divisions?: MediaWorldDivisionGroup[];
}) {
  const [listings, setListings] = useState(initialListings);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [filters, setFilters] = useState<MediaWorldFilters>({ query: '', category: '', division: '', district: '' });
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load(cursor?: string | null, append = false, next?: MediaWorldFilters) {
    setLoading(true);
    setError('');
    try {
      const active = next ?? filters;
      const params = new URLSearchParams();
      if (active.query.trim()) params.set('q', active.query.trim());
      if (active.category) params.set('category', active.category);
      // Division/district are free-text location matches; district alone works
      // (e.g. Rajshahi -> Bogura finds listings whose location contains Bogura).
      if (active.district) params.set('district', active.district);
      else if (active.division) params.set('division', active.division);
      if (cursor) params.set('cursor', cursor);
      const response = await fetch(`/api/mediaworld?${params}`);
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? 'Unable to load Media World.');
        return;
      }
      setListings((current) => (append ? [...current, ...(body.listings ?? [])] : (body.listings ?? [])));
      setNextCursor(body.nextCursor ?? null);
    } catch {
      setError('Unable to load Media World. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function applyFilters(next: MediaWorldFilters) {
    setFilters(next);
    setQuery(next.query);
    void load(null, false, next);
  }

  useEffect(() => {
    setQuery(filters.query);
  }, [filters.query]);

  return (
    <section className="marketplace-browser" data-testid="mediaworld-browser">
      <header className="marketplace-header">
        <div>
          <h1>MediaWorld</h1>
          <p>Casting, hiring and equipment rentals across Bangladesh — no separate login needed.</p>
        </div>
        <Link className="fb-btn fb-btn-primary" href="/marketplace/create">Post a listing</Link>
      </header>

      <MediaWorldFiltersBar filters={{ ...filters, query }} onFilter={applyFilters} />

      {divisions && divisions.length ? (
        <div className="marketplace-load-more" data-testid="division-pills">
          {divisions.map((division) => (
            <button
              key={division.division}
              type="button"
              className="fb-btn fb-btn-ghost"
              onClick={() => applyFilters({ ...filters, division: division.division, district: '' })}
            >
              {division.division} ({division.items.length})
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p role="alert" className="marketplace-error">{error}</p> : null}

      {listings.length ? (
        <>
          <div className="marketplace-grid">
            {listings.map((listing) => (
              <MediaWorldListingCard key={listing.id} listing={listing} viewerId={viewerId} />
            ))}
          </div>
          {nextCursor ? (
            <button
              className="fb-btn fb-btn-ghost marketplace-load-more"
              disabled={loading}
              onClick={() => void load(nextCursor, true)}
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          ) : null}
        </>
      ) : (
        <div className="empty-feed surface" data-testid="empty-mediaworld">
          <strong>No Media World listings yet</strong>
          <span>Try a different search, or be the first to post in your district.</span>
          <Link className="fb-btn fb-btn-primary" href="/marketplace/create">Post a listing</Link>
        </div>
      )}
    </section>
  );
}
