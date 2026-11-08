'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { MediaWorldListing } from '@/lib/mediaworld';
import {
  DISTRICTS_BY_DIVISION,
  MEDIA_WORLD_CATEGORY_LABELS,
  MEDIAWORLD_DIVISIONS,
  isMediaWorldServiceCategory,
} from '@/lib/mediaworld';
import MediaWorldComplaintModal from '@/components/mediaworld/mediaworld-complaint-modal';
import AILoginModal from '@/components/mediaworld/ai-login-modal';
import JoinModal from '@/components/mediaworld/join-modal';
import MediaWorldLogoutButton from '@/components/mediaworld/talent/mediaworld-logout-button';
import TalentCard from '@/components/mediaworld/talent/talent-card';
import {
  MediaWorldLanguageProvider,
  MediaWorldLanguageToggle,
  useMediaWorldLanguage,
} from '@/components/mediaworld/mediaworld-language';
import type { TalentDirectoryRow } from '@/lib/mediaworld/talent-browse';
import { talentMatchesLane } from '@/lib/mediaworld/talent-lanes';
const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'featured', label: 'Featured Services', icon: '✦' },
  { key: 'rentals', label: 'Top Rentals', icon: '🎬' },
  { key: 'spots', label: 'Top Spots', icon: '🏡' },
  { key: 'talent', label: 'Featured Talent', icon: '⭐' },
] as const;

type CategoryKey =
  | 'CAMERA_HOUSE'
  | 'DIRECTOR'
  | 'DRONE'
  | 'SPOT'
  | 'LIGHT_HOUSE'
  | 'SHOOTING_BUS_CAR'
  | 'PRODUCTION'
  | 'MAKEUP_MAN'
  | 'ARTIST';

const SERVICE_CATEGORIES: ReadonlyArray<{ key: CategoryKey; label: string; icon: string }> = [
  { key: 'CAMERA_HOUSE', label: 'Camera Rental', icon: '📷' },
  { key: 'DIRECTOR', label: 'Director & Crew', icon: '🎬' },
  { key: 'DRONE', label: 'Drone Service', icon: '🚁' },
  { key: 'SPOT', label: 'Shooting Spot', icon: '🏡' },
  { key: 'LIGHT_HOUSE', label: 'Light Setup', icon: '💡' },
  { key: 'SHOOTING_BUS_CAR', label: 'Transport', icon: '🚐' },
  { key: 'PRODUCTION', label: 'Post Production', icon: '🎛️' },
  { key: 'MAKEUP_MAN', label: 'Makeup & Styling', icon: '✨' },
  { key: 'ARTIST', label: 'Artist & Model', icon: '🎭' },
];

const FOOTER_CATEGORY_LINKS: ReadonlyArray<{ key: CategoryKey; label: string }> = [
  { key: 'CAMERA_HOUSE', label: 'Cameras and lenses' },
  { key: 'ARTIST', label: 'Artist database' },
  { key: 'SPOT', label: 'Shooting spots' },
  { key: 'DRONE', label: 'Drone coverage' },
  { key: 'SHOOTING_BUS_CAR', label: 'Production transport' },
];

const DISCOVERY_CATEGORIES: ReadonlyArray<{
  key: CategoryKey;
  title: string;
  description: string;
  icon: string;
  tone: 'rose' | 'blue' | 'amber' | 'cyan' | 'violet' | 'yellow' | 'teal' | 'indigo';
}> = [
  { key: 'ARTIST', title: 'Artist and actor', description: 'Actor, Drama, Movie', icon: '🎭', tone: 'rose' },
  { key: 'CAMERA_HOUSE', title: 'Cameras and lenses', description: 'Sony, RED, Arri, Canon', icon: '📷', tone: 'blue' },
  { key: 'SPOT', title: 'Shooting spot and house', description: 'Indoor, Outdoor, Resort', icon: '🏠', tone: 'amber' },
  { key: 'DRONE', title: 'Drones and operators', description: '4K, FPV, Aerial Shot', icon: '🚁', tone: 'cyan' },
  { key: 'DIRECTOR', title: 'Director and DOP', description: 'Director, Cinematographer', icon: '🎥', tone: 'violet' },
  { key: 'MAKEUP_MAN', title: 'Makeup & Styling', description: 'Hair, Makeup, Styling', icon: '✨', tone: 'violet' },
  { key: 'LIGHT_HOUSE', title: 'Light setup and grip', description: 'Aputure, Godox, HMI', icon: '💡', tone: 'yellow' },
  { key: 'SHOOTING_BUS_CAR', title: 'Shooting car', description: 'Van, Micro, Premar Car', icon: '🚐', tone: 'teal' },
  { key: 'PRODUCTION', title: 'Studio and post production', description: 'Color grading, editing, dubbing', icon: '🎛️', tone: 'indigo' },
];

const POPULAR_TAGS = ['#SonyFX3', '#RED Camera', '#ShootingSpot', '#DroneRental', '#FemaleModel'] as const;

type MemberAvatar = { name: string; image: string | null };
type ProfileCta = { href: string; kind: 'open' | 'create' };
type MediaWorldPlatformProps = {
  initialListings: MediaWorldListing[];
  initialTalents: TalentDirectoryRow[];
  authenticated: boolean;
  profileCta?: ProfileCta;
  memberAvatar?: MemberAvatar;
};

const BUDGET_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'সর্বোচ্চ বাজেট' },
  { value: '500', label: '৳ 500' },
  { value: '1000', label: '৳ 1,000' },
  { value: '3000', label: '৳ 3,000' },
  { value: '5000', label: '৳ 5,000' },
  { value: '10000', label: '৳ 10,000' },
  { value: '20000', label: '৳ 20,000+' },
];

function formatRate(pricePaisa: number): string {
  return `৳ ${(pricePaisa / 100).toLocaleString('en-US')} / দিন`;
}

function ServiceCard({ item }: { item: MediaWorldListing }) {
  const cover = item.images?.[0]?.url ?? null;
  const categoryLabel =
    MEDIA_WORLD_CATEGORY_LABELS[item.category as keyof typeof MEDIA_WORLD_CATEGORY_LABELS] ?? item.category;
  const icon = SERVICE_CATEGORIES.find((c) => c.key === item.category)?.icon ?? '📦';
  return (
    <article className='mediaworld-service-card' aria-label={item.title}>
      {cover ? (
        <img src={cover} alt={item.title} className='mediaworld-card-cover' />
      ) : (
        <div className='mediaworld-card-cover mediaworld-card-placeholder'>{icon}</div>
      )}
      <div className='mediaworld-card-body'>
        <div className='mediaworld-card-header'>
          <span className='mediaworld-card-badge'>{categoryLabel}</span>
        </div>
        <h3 className='mediaworld-card-title'>{item.title}</h3>
        <span className='mediaworld-card-loc'>📍 {item.location || 'Bangladesh'}</span>
        <div className='mediaworld-card-price-line'>
          <span className='mediaworld-card-price'>{formatRate(item.pricePaisa)}</span>
        </div>
        <Link href={`/marketplace/${item.id}`} className='mediaworld-card-cta'>
          বিস্তারিত দেখুন
        </Link>
      </div>
    </article>
  );
}

function ServiceRail({
  id,
  title,
  items,
  onSeeAll,
}: {
  id: string;
  title: string;
  items: MediaWorldListing[];
  onSeeAll: () => void;
}) {
  return (
    <section id={id} className='mediaworld-rail' aria-label={title}>
      <div className='mediaworld-section-head'>
        <h2>{title}</h2>
        <button type='button' className='mediaworld-see-all' onClick={onSeeAll}>
          দেখুন সব <span>→</span>
        </button>
      </div>
      <div className='mediaworld-poster-grid'>
        {items.map((item) => (
          <ServiceCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function AvailableServiceCard({ item }: { item: MediaWorldListing }) {
  const cover = item.images?.[0]?.url ?? null;
  const categoryLabel =
    MEDIA_WORLD_CATEGORY_LABELS[item.category as keyof typeof MEDIA_WORLD_CATEGORY_LABELS] ?? item.category;
  const icon = SERVICE_CATEGORIES.find((category) => category.key === item.category)?.icon ?? '📦';

  return (
    <article className='mediaworld-available-card' aria-label={item.title}>
      <div className='mediaworld-available-image'>
        {cover ? <img src={cover} alt={item.title} /> : <span>{icon}</span>}
        <span className='mediaworld-available-badge'>{categoryLabel}</span>
      </div>
      <div className='mediaworld-available-body'>
        <div className='mediaworld-available-meta'>
          <span>📍 {item.location || 'Bangladesh'}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.description || 'Professional media support available for your next production.'}</p>
        <div className='mediaworld-available-footer'>
          <div>
            <small>Daily charge</small>
            <strong>{formatRate(item.pricePaisa).replace(' / দিন', '')}</strong>
          </div>
          <Link href={`/marketplace/${item.id}`}>Details / Booking</Link>
        </div>
      </div>
    </article>
  );
}

function MediaWorldPlatformContent({
  initialListings,
  initialTalents,
  authenticated,
  profileCta,
  memberAvatar,
}: {
  initialListings: MediaWorldListing[];
  initialTalents: TalentDirectoryRow[];
  authenticated: boolean;
  profileCta?: ProfileCta;
  memberAvatar?: MemberAvatar;
}) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const [activeNav, setActiveNav] = useState('home');
  const [activeCategory, setActiveCategory] = useState<CategoryKey | 'ALL'>('ALL');
  const [activeDivision, setActiveDivision] = useState('');
  const [activeDistrict, setActiveDistrict] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [listings, setListings] = useState<MediaWorldListing[]>(
    initialListings.filter((item) => isMediaWorldServiceCategory(item.category))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const districts = useMemo(
    () =>
      activeDivision
        ? [...(DISTRICTS_BY_DIVISION[activeDivision as keyof typeof DISTRICTS_BY_DIVISION] ?? [])]
        : ([] as string[]),
    [activeDivision]
  );

  // Fetch from /api/mediaworld whenever query/category/division/district change.
  useEffect(() => {
    let cancelled = false;
    async function fetchListings() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (appliedQuery.trim()) params.set('q', appliedQuery.trim());
        if (activeCategory !== 'ALL') params.set('category', activeCategory);
        if (activeDistrict) params.set('district', activeDistrict);
        else if (activeDivision) params.set('division', activeDivision);
        const response = await fetch(`/api/mediaworld?${params}`);
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          if (!cancelled) setError(body?.error || 'তালিকা লোড করতে সমস্যা হচ্ছে।');
          return;
        }
        if (!cancelled) {
          setListings((body.listings ?? []).filter(
            (item: MediaWorldListing) => isMediaWorldServiceCategory(item.category)
          ));
        }
      } catch {
        if (!cancelled) setError('কানেকশন পরীক্ষা করে আবার চেষ্টা করুন।');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchListings();
    return () => {
      cancelled = true;
    };
  }, [appliedQuery, activeCategory, activeDivision, activeDistrict, reloadKey]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setAppliedQuery(searchInput);
  }

  function pickTag(tag: string) {
    const plain = tag.replace(/^#/, '');
    setSearchInput(plain);
    setAppliedQuery(plain);
  }

  function resetDivision(nextDivision: string) {
    setActiveDivision(nextDivision);
    setActiveDistrict('');
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectNav(key: string) {
    const destinations: Record<string, string> = {
      home: 'mediaworld-hero',
      featured: 'mediaworld-available-services',
      rentals: 'mw-rail-rentals',
      spots: 'mw-rail-spots',
      talent: 'mw-talent-directory',
    };
    setActiveNav(key);
    const destination = destinations[key];
    if (destination) scrollTo(destination);
  }

  function showAllServices() {
    setActiveNav('featured');
    scrollTo('mediaworld-available-services');
  }

  function filterFromFooter(category: CategoryKey) {
    setActiveCategory(category);
    setActiveNav('featured');
    scrollTo('mediaworld-available-services');
  }

  function filterDivisionFromFooter(division: string) {
    resetDivision(division);
    setActiveNav('featured');
    scrollTo('mediaworld-available-services');
  }

  // Client-side budget filter on top of API results.
  const visible = useMemo(() => {
    if (!maxBudget) return listings;
    const budgetPaise = Number(maxBudget) * 100;
    return listings.filter((item) => item.pricePaisa <= budgetPaise);
  }, [listings, maxBudget]);

  const rentalCategories = new Set(['CAMERA_HOUSE', 'DRONE', 'LIGHT_HOUSE']);
  const talentCategories = new Set(['DIRECTOR', 'ARTIST', 'PRODUCTION', 'MAKEUP_MAN']);
  const spotCategories = new Set(['SPOT', 'SHOOTING_BUS_CAR']);

  const rentals = visible.filter((item) => rentalCategories.has(item.category));
  const talent = visible.filter((item) => talentCategories.has(item.category));
  const spots = visible.filter((item) => spotCategories.has(item.category));
  const fallback = visible.filter(
    (item) =>
      isMediaWorldServiceCategory(item.category) &&
      !rentalCategories.has(item.category) &&
      !talentCategories.has(item.category) &&
      !spotCategories.has(item.category)
  );
  const matchedTalents = initialTalents.filter((talent) => {
    if (!talentMatchesLane(talent, activeCategory)) return false;
    if (activeDivision && (talent.division ?? '').toLowerCase() !== activeDivision.toLowerCase()) return false;
    if (activeDistrict && (talent.district ?? '').toLowerCase() !== activeDistrict.toLowerCase()) return false;
    return true;
  });
  const shownTalents = matchedTalents.slice(0, 8);
  const shownCount = shownTalents.length;
  const matchedCount = matchedTalents.length;

  return (
    <section className='mediaworld-platform-layout' aria-label='TF Media World'>
      <div className='mediaworld-language-bar'>
        <MediaWorldLanguageToggle />
      </div>
      <aside className='mediaworld-sidebar'>
        <div className='mediaworld-sidebar-title'>
          {memberAvatar?.image ? (
            <img className='mediaworld-sidebar-avatar' src={memberAvatar.image} alt={memberAvatar.name} />
          ) : (
            <span>🎬</span>
          )}
          <div>
            <strong>TF Media World</strong>
            <small>শুটিং সাপোর্ট ডিরেক্টরি</small>
          </div>
        </div>

        <nav className='mediaworld-quick-links' aria-label='Main navigation'>
          <Link href='/dashboard'><span aria-hidden='true'>↗</span> TwingFace</Link>
        </nav>

        <nav className='mediaworld-navigation' aria-label='MediaWorld navigation'>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type='button'
              className={activeNav === item.key ? 'active' : ''}
              onClick={() => selectNav(item.key)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className='mediaworld-sidebar-divider' />

        <div className='mediaworld-category-menu'>
          <label className='mediaworld-menu-label'>ক্যাটাগরি ফিল্টার</label>
          <div className='mediaworld-category-list'>
            <button
              type='button'
              className={activeCategory === 'ALL' ? 'active' : ''}
              onClick={() => setActiveCategory('ALL')}
            >
              সব ক্যাটাগরি
            </button>
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type='button'
                className={activeCategory === cat.key ? 'active' : ''}
                onClick={() => setActiveCategory(cat.key)}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className='mediaworld-division-menu'>
          <label className='mediaworld-menu-label'>বিভাগ ফিল্টার</label>
          <div className='mediaworld-division-list'>
            <button
              type='button'
              className={!activeDivision ? 'active' : ''}
              onClick={() => resetDivision('')}
            >
              সব বিভাগ
            </button>
            {MEDIAWORLD_DIVISIONS.map((division) => (
              <button
                key={division}
                type='button'
                className={activeDivision === division ? 'active' : ''}
                onClick={() => resetDivision(division)}
              >
                {division}
              </button>
            ))}
          </div>
        </div>

        <div className='mediaworld-premium-promo'>
          <span>✦ সার্ভিস পোস্ট করুন</span>
          <strong>আপনার সার্ভিসটি তালিকাভুক্ত করুন</strong>
          <p>টুইংফেস মিডিয়া ওয়ার্ল্ডে আপনার পেশাদার প্রোফাইল তৈরি করুন এবং শুটিং কন্ট্রাক্ট পান।</p>
          <Link href='/mediaworld/register' className='mediaworld-promo-button'>
            এখন রেজিস্টার করুন <b>→</b>
          </Link>
        </div>
      </aside>

      <main className='mediaworld-main mediaworld-main-cinematic'>
        <section className='mediaworld-hero-card' id='mediaworld-hero'>
          <div className='mediaworld-hero-background' aria-hidden='true' />
          <div className='mediaworld-hero-content'>
            <div className='mediaworld-hero-copy'>
              <p className='mediaworld-hero-eyebrow'>TF Media World Directory</p>
              <h1>শুটিংয়ের সব সাপোর্ট এক ছাদের নিচে — TF Media World</h1>
              <p className='mediaworld-hero-subtitle'>
                বাংলাদেশের সেরা মিডিয়া প্রফেশনাল এবং ইকুইপমেন্ট রেন্টাল সার্ভিস খুঁজুন।
              </p>

              <div className='mediaworld-hero-actions'>
                <button
                  type='button'
                  className='mediaworld-hero-action mediaworld-hero-action-danger'
                  onClick={() => setComplaintOpen(true)}
                  data-testid='mediaworld-complaint-trigger'
                >
                  Complain
                </button>
                {!authenticated ? (
                  <>
                    <button
                      type='button'
                      className='mediaworld-hero-action mediaworld-hero-action-primary'
                      onClick={() => setLoginOpen(true)}
                      data-testid='mediaworld-login-trigger'
                    >
                      Login
                    </button>
                    <button
                      type='button'
                      className='mediaworld-hero-action mediaworld-hero-action-ghost mw-join-trigger'
                      onClick={() => setJoinOpen(true)}
                      aria-haspopup='dialog'
                      data-testid='mediaworld-join-trigger'
                    >
                      <span className='mw-join-trigger-icon' aria-hidden='true'>＋</span>
                      Join as Professional
                    </button>
                  </>
                ) : (
                  <>
                    {profileCta ? (
                      <Link
                        href={profileCta.href}
                        className='mediaworld-hero-action mediaworld-hero-action-primary'
                        data-testid='mediaworld-profile-cta'
                      >
                        {profileCta.kind === 'open'
                          ? (bn ? 'প্রোফাইল' : 'Profile')
                          : (bn ? 'প্রোফাইল তৈরি করুন' : 'Create profile')}
                      </Link>
                    ) : null}
                    <MediaWorldLogoutButton className='mediaworld-hero-action mediaworld-hero-action-ghost' />
                    <Link href='/for-rent' className='mediaworld-hero-action mediaworld-hero-action-ghost'>
                      {bn ? 'রেন্ট করুন' : 'Rent'}
                    </Link>
                    <Link href='/mediaworld/talent' className='mediaworld-hero-action mediaworld-hero-action-ghost'>
                      {bn ? 'ট্যালেন্ড খুঁজুন' : 'Find talent'}
                    </Link>
                  </>
                )}
              </div>
            </div>

            <form className='mediaworld-search-row' onSubmit={submitSearch} role='search'>
            <label className='mediaworld-filter-label' htmlFor='mw-search' style={{ position: 'absolute', left: -9999 }}>
              অনুসন্ধান
            </label>
            <input
              id='mw-search'
              type='search'
              className='mediaworld-filter-input'
              placeholder='শিল্পী, সরঞ্জাম বা লোকেশন...'
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <button type='submit' className='mediaworld-search-btn'>
              খুঁজুন
            </button>
            </form>

            <div className='mediaworld-hero-filters-4'>
            <div className='mediaworld-filter-group'>
              <label className='mediaworld-filter-label' htmlFor='mw-cat'>
                ক্যাটাগরি
              </label>
              <select
                id='mw-cat'
                className='mediaworld-filter-select'
                value={activeCategory === 'ALL' ? '' : activeCategory}
                onChange={(event) =>
                  setActiveCategory((event.target.value as CategoryKey) || 'ALL')
                }
              >
                <option value=''>সব ক্যাটাগরি</option>
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className='mediaworld-filter-group'>
              <label className='mediaworld-filter-label' htmlFor='mw-div'>
                বিভাগ
              </label>
              <select
                id='mw-div'
                className='mediaworld-filter-select'
                value={activeDivision}
                onChange={(event) => resetDivision(event.target.value)}
              >
                <option value=''>সব বিভাগ</option>
                {MEDIAWORLD_DIVISIONS.map((division) => (
                  <option key={division} value={division}>
                    {division}
                  </option>
                ))}
              </select>
            </div>
            <div className='mediaworld-filter-group'>
              <label className='mediaworld-filter-label' htmlFor='mw-dist'>
                জেলা
              </label>
              <select
                id='mw-dist'
                className='mediaworld-filter-select'
                value={activeDistrict}
                disabled={!activeDivision}
                onChange={(event) => setActiveDistrict(event.target.value)}
              >
                <option value=''>{activeDivision ? 'সব জেলা' : 'বিভাগ নির্বাচন করুন'}</option>
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>
            <div className='mediaworld-filter-group'>
              <label className='mediaworld-filter-label' htmlFor='mw-budget'>
                সর্বোচ্চ বাজেট
              </label>
              <select
                id='mw-budget'
                className='mediaworld-filter-select'
                value={maxBudget}
                onChange={(event) => setMaxBudget(event.target.value)}
              >
                {BUDGET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            </div>

            <div className='mediaworld-tag-chips' aria-label='Popular searches'>
            {POPULAR_TAGS.map((tag) => (
              <button key={tag} type='button' className='mediaworld-tag-chip' onClick={() => pickTag(tag)}>
                {tag}
              </button>
            ))}
            </div>
          </div>
        </section>

        <section className='mediaworld-service-categories' aria-labelledby='mediaworld-service-categories-title'>
          <div className='mediaworld-category-heading'>
            <div>
              <p>Service category</p>
              <h2 id='mediaworld-service-categories-title'>Choose the media category you need.</h2>
            </div>
            <span>Explore media professionals and equipment for every step of shooting production.</span>
          </div>
          <div className='mediaworld-category-grid'>
            {DISCOVERY_CATEGORIES.map((category, index) => (
              <button
                key={`${category.key}-${index}`}
                type='button'
                className={`mediaworld-discovery-card tone-${category.tone}${activeCategory === category.key ? ' active' : ''}`}
                onClick={() => setActiveCategory(category.key)}
              >
                <span className='mediaworld-discovery-icon'>{category.icon}</span>
                <strong>{category.title}</strong>
                <small>{category.description}</small>
              </button>
            ))}
            <button
              type='button'
              className={`mediaworld-discovery-card mediaworld-discovery-all${activeCategory === 'ALL' ? ' active' : ''}`}
              onClick={() => setActiveCategory('ALL')}
            >
              <span className='mediaworld-discovery-icon'>▦</span>
              <strong>See all services</strong>
              <small>All directories →</small>
            </button>
          </div>
        </section>

        <section id='mediaworld-available-services' className='mediaworld-available-services' aria-labelledby='mediaworld-available-services-title'>
          <div className='mediaworld-available-heading'>
            <div>
              <h2 id='mediaworld-available-services-title'>List of available services and fares</h2>
              <p>Showing: {Math.min(visible.length, 8)} posts</p>
            </div>
            <div className='mediaworld-available-filters' aria-label='Available service filters'>
              <button type='button' className={activeCategory === 'ALL' ? 'active' : ''} onClick={() => setActiveCategory('ALL')}>All</button>
              <button type='button' className={activeCategory === 'CAMERA_HOUSE' ? 'active' : ''} onClick={() => setActiveCategory('CAMERA_HOUSE')}>Camera</button>
              <button type='button' className={activeCategory === 'ARTIST' ? 'active' : ''} onClick={() => setActiveCategory('ARTIST')}>Artist</button>
              <button type='button' className={activeCategory === 'SPOT' ? 'active' : ''} onClick={() => setActiveCategory('SPOT')}>Shooting spot</button>
              <button type='button' className={activeCategory === 'DRONE' ? 'active' : ''} onClick={() => setActiveCategory('DRONE')}>Drone</button>
            </div>
          </div>
          <section className='mw-talent-directory' id='mw-talent-directory' aria-labelledby='mw-talent-directory-title'>
            <div className='mediaworld-available-heading'>
              <div>
                <h3 id='mw-talent-directory-title'>{bn ? 'ফিচারড ট্যালেন্ট' : 'Featured Talent'}</h3>
                <p>{`Showing ${shownCount} of ${matchedCount} profiles`}</p>
              </div>
              <Link className='mw-talent-directory-more' href='/mediaworld/talent'>
                {bn ? 'সব ট্যালেন্ট দেখুন' : 'Browse all talent'}
              </Link>
            </div>
            {!authenticated ? (
              <p>{bn ? 'প্রোফাইল খুলতে ও যোগাযোগের তথ্য দেখতে সাইন ইন করুন।' : 'Sign in to open a profile and see contact details.'}</p>
            ) : null}
            {matchedCount === 0 && !loading && !error && (
              <p className='mw-talent-directory-empty'>
                {bn ? 'এই ক্যাটাগরি ও এলাকায় এখনো কোনো ট্যালেন্ট নেই।' : 'No talent found in this category and area yet.'}
              </p>
            )}
            {matchedCount > 0 && (
              <div className='mw-talent-grid'>
                {shownTalents.map((talent) => <TalentCard key={talent.id} talent={talent} />)}
              </div>
            )}
          </section>
          <div className='mediaworld-available-grid'>
            {visible.slice(0, 8).map((item) => (
              <AvailableServiceCard key={item.id} item={item} />
            ))}
          </div>
        </section>

        {loading && <div className='mediaworld-loading'>লোড হচ্ছে...</div>}
        {error && (
          <div className='mediaworld-empty' role='alert'>
            <strong className='text-slate-300'>{error}</strong>
            <button
              type='button'
              className='mediaworld-cta-button'
              onClick={() => setReloadKey((key) => key + 1)}
            >
              পুনরায় চেষ্টা করুন
            </button>
          </div>
        )}

        <div className='mediaworld-rails'>
          {rentals.length > 0 && (
            <ServiceRail id='mw-rail-rentals' title='জনপ্রিয় সরঞ্জাম রেন্টাল' items={rentals} onSeeAll={showAllServices} />
          )}
          {talent.length > 0 && (
            <ServiceRail id='mw-rail-talent' title='ফিচারড ট্যালেন্ড ও ক্রু' items={talent} onSeeAll={showAllServices} />
          )}
          {spots.length > 0 && (
            <ServiceRail id='mw-rail-spots' title='শীর্ষ শুটিং স্পট' items={spots} onSeeAll={showAllServices} />
          )}
          {fallback.length > 0 && (
            <section className='mediaworld-rail mediaworld-rail-misc' aria-label='Others'>
              <div className='mediaworld-section-head'>
                <h2>অন্যান্য সার্ভিস</h2>
                <button type='button' className='mediaworld-see-all' onClick={showAllServices}>দেখুন সব <span>→</span></button>
              </div>
              <div className='mediaworld-poster-grid'>
                {fallback.map((item) => (
                  <ServiceCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}
        </div>

        {visible.length === 0 && !loading && !error && (
          <div className='mediaworld-empty'>
            <strong className='text-slate-300'>কোনো সার্ভিস পাওয়া যায়নি</strong>
            <p className='mt-2 text-sm text-slate-500'>
              অনুরোধটি ঠিক করুন অথবা আপনার জেলায় প্রথম পোস্ট করুন।
            </p>
            <Link className='mt-4 mediaworld-cta-button' href='/mediaworld/register'>
              পোস্ট করুন
            </Link>
          </div>
        )}

        <section className='mediaworld-cta-banner' id='mediaworld-register-cta'>
          <div>
            <h3>আপনার সার্ভিসটি হাজারো মানুষের কাছে পৌঁছে দিন</h3>
            <p>টুইংফেস মিডিয়া ওয়ার্ল্ডে নিজের সার্ভিস ফ্রি লিস্ট করুন।</p>
          </div>
          <Link href='/mediaworld/register' className='mediaworld-cta-button'>
            ফ্রি লিস্ট দিন <b>→</b>
          </Link>
        </section>

        <footer className='mediaworld-directory-footer'>
          <div className='mediaworld-footer-grid'>
            <div className='mediaworld-footer-brand'>
              <h3><span>▰</span> TF <span>Media World</span></h3>
              <p>A trusted directory for drama, cinema, advertising and digital content production across Bangladesh.</p>
            </div>
            <div>
              <h4>Categories</h4>
              {FOOTER_CATEGORY_LINKS.map((link) => (
                <button key={link.key} type='button' onClick={() => filterFromFooter(link.key)}>{link.label}</button>
              ))}
            </div>
            <div>
              <h4>Popular Category</h4>
              {MEDIAWORLD_DIVISIONS.map((division) => (
                <button key={division} type='button' onClick={() => filterDivisionFromFooter(division)}>{division}</button>
              ))}
            </div>
            <div><h4>Contact and Help</h4><a href='tel:+8801700000000'>☎ +880 1700-00000</a><a href='mailto:support@twingface.com'>✉ support@twingface.com</a><span>● Nikunja-2, Khilkhet, Dhaka-1229</span></div>
          </div>
          <div className='mediaworld-footer-bottom'><span>© 2026 TF Media World. All rights reserved.</span></div>
        </footer>
      </main>

      <MediaWorldComplaintModal open={complaintOpen} onClose={() => setComplaintOpen(false)} />
      <AILoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} authenticated={authenticated} />
    </section>
  );
}

export default function MediaWorldPlatform({
  initialListings,
  initialTalents,
  authenticated,
  profileCta,
  memberAvatar,
}: MediaWorldPlatformProps) {
  return (
    <MediaWorldLanguageProvider>
      <MediaWorldPlatformContent
        initialListings={initialListings}
        initialTalents={initialTalents}
        authenticated={authenticated}
        profileCta={profileCta}
        memberAvatar={memberAvatar}
      />
    </MediaWorldLanguageProvider>
  );
}
