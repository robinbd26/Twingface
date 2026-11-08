'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { SafeMarketplaceListing } from '@/lib/marketplace';
import MarketplaceCard from './marketplace-card';

const categories = ['ELECTRONICS', 'VEHICLES', 'PROPERTY', 'FURNITURE', 'FASHION', 'HOBBIES', 'OTHER'];
const categoryIcons: Record<string, string> = { ELECTRONICS: '📱', VEHICLES: '🚗', PROPERTY: '🏠', FURNITURE: '🛋️', FASHION: '👕', HOBBIES: '🎮', OTHER: '🛍️' };

function formatCategory(category: string) { return category.charAt(0) + category.slice(1).toLowerCase(); }

export default function MarketplaceBrowser({ initialListings, initialNextCursor }: { initialListings: SafeMarketplaceListing[]; initialNextCursor: string | null }) {
  const [listings, setListings] = useState(initialListings); const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [query, setQuery] = useState(''); const [category, setCategory] = useState(''); const [condition, setCondition] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const visibleListings = useMemo(() => listings.filter((listing) => !condition || listing.condition === condition), [condition, listings]);
  async function load(cursor?: string | null, append = false) {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams(); if (query.trim()) params.set('q', query.trim()); if (category) params.set('category', category); if (cursor) params.set('cursor', cursor);
      const response = await fetch(`/api/marketplace?${params}`); const body = await response.json().catch(() => null);
      if (!response.ok) { setError(body?.error ?? 'Unable to load Marketplace.'); return; }
      setListings((current) => append ? [...current, ...(body.listings ?? [])] : (body.listings ?? [])); setNextCursor(body.nextCursor ?? null);
    } catch { setError('Unable to load Marketplace. Check your connection and try again.'); } finally { setLoading(false); }
  }
  function search(event: React.FormEvent) { event.preventDefault(); void load(null); }
  function selectCategory(nextCategory: string) { setCategory(nextCategory); setCondition(''); }

  return <section className='marketplace-reference-layout'>
    <aside className='marketplace-reference-sidebar' aria-label='Marketplace navigation'>
      <div className='marketplace-sidebar-heading'><span className='marketplace-sidebar-icon'>🏪</span><div><h1>Marketplace</h1><p>Buy and sell in your community</p></div></div>
      <Link className='marketplace-sell-action' href='/marketplace/create'>＋ Create new listing</Link>
      <nav className='marketplace-sidebar-nav'><button type='button' className={!category ? 'active' : ''} onClick={() => selectCategory('')}><span>⌂</span> Browse all</button><Link href='/marketplace/mine'><span>▣</span> Your listings</Link><Link href='/messages'><span>✉</span> Buying messages</Link></nav>
      <div className='marketplace-sidebar-divider' /><p className='marketplace-sidebar-label'>Categories</p>
      <nav className='marketplace-category-nav'>{categories.map((item) => <button key={item} type='button' className={category === item ? 'active' : ''} onClick={() => selectCategory(item)}><span>{categoryIcons[item]}</span>{formatCategory(item)}</button>)}</nav>
    </aside>
    <main className='marketplace-reference-main'>
      <header className='marketplace-reference-header'><div><p className='marketplace-kicker'>TwingFace Marketplace</p><h2>Discover great deals near you</h2><p>Browse new and pre-owned items from people across Bangladesh.</p></div><Link className='marketplace-sell-action marketplace-sell-action-desktop' href='/marketplace/create'>＋ Sell something</Link></header>
      <form className='marketplace-reference-search' onSubmit={search}><label className='sr-only' htmlFor='marketplace-reference-search-input'>Search Marketplace</label><span aria-hidden='true'>⌕</span><input id='marketplace-reference-search-input' aria-label='Search marketplace' value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search Marketplace' maxLength={120} /><select aria-label='Marketplace category' value={category} onChange={(event) => setCategory(event.target.value)}><option value=''>All categories</option>{categories.map((item) => <option key={item} value={item}>{formatCategory(item)}</option>)}</select><select aria-label='Marketplace condition' value={condition} onChange={(event) => setCondition(event.target.value)}><option value=''>All conditions</option><option value='NEW'>New</option><option value='USED'>Used</option></select><button type='submit' disabled={loading}>{loading ? 'Searching…' : 'Search'}</button></form>
      <div className='marketplace-reference-category-chips' aria-label='Popular categories'><button type='button' className={!category ? 'active' : ''} onClick={() => selectCategory('')}>All items</button>{categories.map((item) => <button key={item} type='button' className={category === item ? 'active' : ''} onClick={() => selectCategory(item)}>{categoryIcons[item]} {formatCategory(item)}</button>)}</div>
      {error ? <p role='alert' className='marketplace-error'>{error}</p> : null}
      <div className='marketplace-results-heading'><div><h2>{category ? `${formatCategory(category)} listings` : 'Today’s picks'}</h2><p>{visibleListings.length} item{visibleListings.length === 1 ? '' : 's'} available</p></div><Link href='/marketplace/create'>Sell something</Link></div>
      {visibleListings.length ? <><div className='marketplace-grid marketplace-reference-grid'>{visibleListings.map((listing) => <MarketplaceCard key={listing.id} listing={listing} />)}</div>{nextCursor ? <button className='fb-btn fb-btn-ghost marketplace-load-more' disabled={loading} onClick={() => void load(nextCursor, true)}>{loading ? 'Loading…' : 'Load more listings'}</button> : null}</> : <div className='marketplace-reference-empty'><span>📦</span><strong>No items found</strong><p>Try a different category, condition, or search term.</p><button type='button' onClick={() => { setCategory(''); setCondition(''); setQuery(''); }}>Reset filters</button></div>}
    </main>
  </section>;
}
