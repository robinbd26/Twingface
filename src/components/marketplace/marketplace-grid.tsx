'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SafeListing } from '@/lib/listing';
import { conditionLabel, formatPrice } from '@/lib/listing';

function Card({ listing, viewerId }: { listing: SafeListing; viewerId: string }) {
  const [soldBusy, setSoldBusy] = useState(false);
  const own = listing.sellerId === viewerId;

  async function markSold() {
    setSoldBusy(true);
    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SOLD' }),
      });
      if (response.ok) window.location.reload();
    } finally {
      setSoldBusy(false);
    }
  }

  return (
    <article className='fb-card surface group-post' data-testid={`listing-${listing.id}`}>
      {listing.imageUrl ? <img src={listing.imageUrl} alt={listing.title} style={{ width: '100%', borderRadius: 8 }} /> : null}
      <div className='fb-card-head'>
        <div>
          <h2>{listing.title}</h2>
          <p className='fb-friends-count'>{formatPrice(listing.price)} · {conditionLabel(listing.condition)}</p>
        </div>
      </div>
      {listing.description ? <p>{listing.description}</p> : null}
      <p className='fb-friends-count'>
        <Link className='page-card-link' href={`/${listing.seller.username}`}>{listing.seller.name}</Link>
        {listing.location ? ` · ${listing.location}` : ''} · {listing.category}
      </p>
      {own ? (
        <button type='button' className='fb-btn fb-btn-ghost' disabled={soldBusy} onClick={() => void markSold()}>
          {soldBusy ? 'Marking…' : 'Mark as sold'}
        </button>
      ) : (
        <Link className='fb-btn fb-btn-primary' href={`/${listing.seller.username}`}>Message seller</Link>
      )}
    </article>
  );
}

export default function MarketplaceGrid({ initial, initialQuery, initialCategory, viewerId }: {
  initial: SafeListing[];
  initialQuery: string;
  initialCategory: string;
  viewerId: string;
}) {
  const [query, setQuery] = useState(initialQuery);

  return (
    <>
      <form className='fb-card surface' action='/marketplace' method='get'>
        <input aria-label='Search marketplace' name='query' defaultValue={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search listings…' maxLength={120} />
        {initialCategory ? <input type='hidden' name='category' value={initialCategory} /> : null}
        <button type='submit' className='fb-btn fb-btn-primary'>Search</button>
      </form>
      {initial.length ? (
        <div className='fb-feed'>
          {initial.map((listing) => <Card key={listing.id} listing={listing} viewerId={viewerId} />)}
        </div>
      ) : (
        <div className='empty-feed surface' data-testid='empty-marketplace'>
          <strong>No listings yet</strong>
          <span>Be the first to sell something in your community.</span>
          <Link className='fb-btn fb-btn-primary' href='/marketplace/create'>+ Sell something</Link>
        </div>
      )}
    </>
  );
}
