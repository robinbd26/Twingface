'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MediaWorldLanguageToggle, useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { talentBrowseApiQuery, type TalentBrowseInput, type TalentRow } from '@/lib/mediaworld/talent-browse';
import type { TaxonomySnapshot } from '@/lib/mediaworld/taxonomy';
import TalentCard from './talent-card';
import TalentFilters from './talent-filters';

type Props = {
  filters: TalentBrowseInput;
  initialTalents: TalentRow[];
  initialNextCursor: string | null;
  industries: TaxonomySnapshot['industries'];
  filtersIgnored: boolean;
};

export default function TalentBrowser({ filters, initialTalents, initialNextCursor, industries, filtersIgnored }: Props) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const [talents, setTalents] = useState(initialTalents);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadMore() {
    if (!nextCursor) return;
    setLoading(true);
    setError('');
    try {
      const params = talentBrowseApiQuery(filters);
      params.set('cursor', nextCursor);
      const response = await fetch(`/api/mediaworld/talent?${params}`);
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(bn ? 'আরও প্রোফাইল লোড করা যায়নি।' : 'Unable to load more profiles.');
        return;
      }
      setTalents((current) => [...current, ...((body?.talents ?? []) as TalentRow[])]);
      setNextCursor((body?.nextCursor as string | null) ?? null);
    } catch {
      setError(bn ? 'নেটওয়ার্ক সমস্যা হয়েছে। সংযোগ পরীক্ষা করুন।' : 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className='mw-talent'>
      <header className='mw-talent-head'>
        <div>
          <p className='mw-talent-kicker'>{bn ? 'টুইংফেস মিডিয়া ওয়ার্ল্ড' : 'TwingFace Media World'}</p>
          <h1>{bn ? 'প্রতিভা খুঁজুন' : 'Find Talent'}</h1>
          <p className='mw-talent-lead'>
            {bn
              ? 'পরিচালক, ক্যামেরাম্যান, অভিনেত্রী, এডিটর, মডেল ও সঙ্গীতশিল্পী — ইন্ডাস্ট্রি, ক্যাটাগরি ও পদ অনুযায়ী টিমের লোক খুঁজে নিন।'
              : 'Directors, cameramen, actors, editors, models and musicians — search the whole media workforce by industry, category and designation.'}
          </p>
        </div>
        <div className='mw-talent-head-actions'>
          <MediaWorldLanguageToggle />
          <nav className='mw-talent-links'>
            <Link href='/mediaworld'>{bn ? '← মিডিয়া ওয়ার্ল্ড' : '← Media World'}</Link>
            <Link href='/for-rent'>{bn ? 'ভাড়ার জিনিস' : 'For Rent'}</Link>
            <Link href='/mediaworld/onboarding'>{bn ? 'প্রোফাইল সাজান' : 'Set up your profile'}</Link>
          </nav>
        </div>
      </header>

      <TalentFilters filters={filters} industries={industries} />

      {filtersIgnored ? (
        <p className='mw-talent-notice'>
          {bn ? 'কিছু ফিল্টার বোঝা যায়নি; ডিফল্ট ফলাফল দেখানো হচ্ছে।' : 'Some filters could not be read, so default results are shown.'}
        </p>
      ) : null}

      <div className='mw-talent-results'>
        <h2>{bn ? 'প্রতিভা খোঁজা গেছে' : 'Talents found'}</h2>
        <p>{bn ? `${talents.length}জন` : `${talents.length} profile${talents.length === 1 ? '' : 's'}`}</p>
      </div>

      {error ? <p className='mw-talent-error' role='alert'>{error}</p> : null}

      {talents.length ? (
        <>
          <div className='mw-talent-grid'>
            {talents.map((talent) => <TalentCard key={talent.id} talent={talent} />)}
          </div>
          {nextCursor ? (
            <button className='mw-talent-more' type='button' onClick={() => void loadMore()} disabled={loading}>
              {loading ? (bn ? 'লোড হচ্ছে…' : 'Loading…') : bn ? 'আরও দেখুন' : 'Load more profiles'}
            </button>
          ) : null}
        </>
      ) : (
        <div className='mw-talent-empty'>
          <span>🎬</span>
          <strong>{bn ? 'কোনো প্রোফাইল পাওয়া যায়নি' : 'No talents found'}</strong>
          <p>{bn ? 'অন্য ইন্ডাস্ট্রি, এলাকা বা খোঁজার শব্দ ব্যবহার করে দেখুন।' : 'Try a different industry, area, or search term.'}</p>
          <Link href='/mediaworld/talent'>{bn ? 'সব ফিল্টার মুছুন' : 'Clear all filters'}</Link>
        </div>
      )}
    </section>
  );
}
