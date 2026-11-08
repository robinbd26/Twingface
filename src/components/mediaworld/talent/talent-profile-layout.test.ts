import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const profile = () => source('src/components/mediaworld/talent/talent-profile.tsx');
const page = () => source('src/app/(main)/mediaworld/talent/[username]/page.tsx');
const gallery = () => source('src/components/mediaworld/talent/talent-showcase-gallery.tsx');
const booking = () => source('src/components/mediaworld/talent/booking-request-card.tsx');
const css = () => source('src/app/dashboard.css');

describe('Media World talent profile layout', () => {
  it('keeps the global navbar and drops the extra profile sub-bar', () => {
    expect(page()).toContain('DashboardNavbar');
    expect(profile()).not.toContain('mw-talent-profile-bar');
    expect(css()).not.toContain('.mw-talent-profile-bar');
  });

  it('renders the hero, quick stats and the responsive 2:1 profile grid', () => {
    const profileSource = profile();

    expect(profileSource).toContain('mw-tp-hero');
    expect(profileSource).toContain('mw-tp-cover');
    expect(profileSource).toContain('mw-tp-avatar');
    expect(profileSource).toContain('mw-tp-stats');
    expect(profileSource).toContain('Portfolio Items');
    expect(profileSource).toContain('Experience');
    expect(profileSource).toContain('Services');
    expect(profileSource).toContain('Reviews');
    expect(profileSource).toContain('grid grid-cols-1 gap-6 lg:grid-cols-3');
    expect(profileSource).toContain('lg:col-span-2');
    expect(profileSource).toContain('lg:col-span-1');
    expect(profileSource).toContain('max-w-[1440px] px-4 py-6 sm:px-6');
    expect(profileSource).toContain('mx-auto!');
    expect(profileSource).toContain('flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#0f172a]/80 p-5 shadow-sm transition-shadow hover:shadow-md');
    expect(page()).toContain('max-w-none! px-0! py-0!');
    expect(profileSource).toContain('FollowButton');
    expect(profileSource).toContain('viewerFollows');
    expect(profileSource).toContain('BookingRequestCard');
  });

  it('stacks main sections on the left and details on the right in the requested order', () => {
    const source = profile();
    const left = source.slice(source.indexOf('lg:col-span-2'), source.indexOf('lg:col-span-1'));
    const side = source.slice(source.indexOf('lg:col-span-1'));
    const order = (text: string, markers: string[]) => markers.map((marker) => text.indexOf(marker));
    const assertAscending = (values: number[]) => {
      values.forEach((value, index) => {
        expect(value).toBeGreaterThan(-1);
        if (index > 0) expect(value).toBeGreaterThan(values[index - 1]);
      });
    };

    assertAscending(order(left, ['About Me', 'Portfolio Showcase', 'Experience & Skills', 'Reviews & Ratings']));
    assertAscending(order(side, [
      'Booking / Availability',
      'Contact Information',
      'Professional Identities',
      'Rate Card',
      'Social Links',
    ]));
  });

  it('uses private pills in contact rows and a booking availability status', () => {
    const profileSource = profile();

    expect(profileSource).toContain('bg-slate-800 text-slate-400');
    expect(profileSource).toContain('Booking requests open');
    expect(profileSource).toContain('Open messages');
    expect(profileSource).toContain('Visitors can send a booking request with their preferred date and project type.');
    expect(profileSource).toContain('Skill');
  });

  it('labels the account-type badge without claiming identity verification', () => {
    const profileSource = profile();

    expect(profileSource).toContain('mw-tp-verified');
    expect(profileSource).toContain('accountLabel} account');
    expect(profileSource).not.toMatch(/verified identity/i);
  });

  it('keeps experience and reviews honest until those features exist', () => {
    const profileSource = profile();

    expect(profileSource).toContain('No experience added yet');
    expect(profileSource).toContain('This profile does not list work history yet.');
    expect(profileSource).toContain('No reviews yet');
    expect(profileSource).toContain('This profile has not received any reviews yet.');
  });

  it('expands long bios with a Read More control', () => {
    expect(profile()).toContain('Read More');
    expect(profile()).toContain('is-clamped');
    expect(profile()).toContain('aria-expanded={bioExpanded}');
    expect(css()).toContain('.mw-tp-about.is-clamped{');
  });

  it('gives the rate card an add or contact action', () => {
    expect(profile()).toContain('Add / Contact for Rates');
    expect(profile()).toContain('No rate card has been added yet.');
    expect(profile()).toContain('hidden.rates');
    expect(profile()).not.toContain('showRatesCard');
  });

  it('always shows the rate and social cards with honest empty states', () => {
    const profileSource = profile();

    expect(profileSource).toContain('This profile has not added social links yet.');
    expect(profileSource).toContain('Add your social links from the profile editor.');
    expect(profileSource).not.toContain('socialLinks.length || isOwner');
  });

  it('filters the portfolio with tabs and labels every card', () => {
    const gallerySource = gallery();

    expect(gallerySource).toContain("role='tablist'");
    expect(gallerySource).toContain("key: 'all'");
    expect(gallerySource).toContain("key: 'photo'");
    expect(gallerySource).toContain("key: 'video'");
    expect(gallerySource).toContain('mw-showcase-badge');
    expect(gallerySource).toContain('showcaseVideoThumbnail');
    expect(gallerySource).toContain('role=\'dialog\'');
    expect(source('src/lib/mediaworld/showcase.ts')).toContain('export function showcaseVideoThumbnail');
  });

  it('sends the booking request through the existing conversation flow', () => {
    const bookingSource = booking();

    expect(bookingSource).toContain('/api/mediaworld/talent/${encodeURIComponent(username)}/message');
    expect(bookingSource).toContain('/api/conversations/${startData.conversationId}/messages');
    expect(bookingSource).toContain('Booking request');
    expect(bookingSource).toContain('id=\'booking\'');
    expect(bookingSource).toContain('<BookingCalendar');
    expect(bookingSource).toContain('id=\'mw-booking-date\'');
  });

  it('offers the owner a logout action in the profile hero', () => {
    const profileSource = profile();
    const logout = source('src/components/mediaworld/talent/mediaworld-logout-button.tsx');
    const ownerActions = profileSource.slice(
      profileSource.indexOf('mw-tp-actions'),
      profileSource.indexOf(') : (', profileSource.indexOf('mw-tp-actions')),
    );

    expect(ownerActions).toContain('MediaWorldLogoutButton');
    expect(logout).toContain("fetch('/api/auth/logout'");
    expect(logout).toContain('window.location.assign(redirectTo)');
    expect(logout).toContain("redirectTo = '/mediaworld'");
    expect(logout).toContain("data-testid='mediaworld-logout'");
    expect(logout).toContain("'Signing out…'");
  });

  it('lets the profile owner return to the Media World landing page', () => {
    expect(profile()).toContain(
      "<Link className='mw-btn mw-btn-secondary' href='/mediaworld' data-testid='talent-profile-mediaworld'>"
    );
    expect(profile()).toContain("{bn ? 'মিডিয়া ওয়ার্ল্ড' : 'Media World'}");
  });

  it('gives a rental owner a post product/service action on their own profile', () => {
    const profileSource = profile();

    expect(profileSource).toContain("const listingPostHref = provider ? '/for-rent/new' : '/for-rent/register'");
    expect(profileSource).toContain("href={listingPostHref} data-testid='rental-post-listing'");
    expect(profileSource).toContain("data-testid='rental-post-listing-empty'");
    expect(profileSource).toContain('Post product / service');
    expect(profileSource).toContain('পণ্য / সার্ভিস পোস্ট করুন');
    expect(profileSource).toContain('Complete provider setup');
  });

  it('keeps the rental card visible on a rental profile with an honest empty state', () => {
    const profileSource = profile();

    expect(profileSource).toContain("profile.accountType === 'RENTAL' ?");
    expect(profileSource).toContain('Rental products & services');
    expect(profileSource).toContain('You have not posted a rental item yet');
    expect(profileSource).toContain('This provider has no active rental listings right now');
    expect(profileSource).not.toContain('This provider has no active rental listings right now.');
  });

  it('shares the card head, icons and detail rows with the rental dashboard', () => {
    const shared = source('src/components/mediaworld/talent/profile-ui.tsx');

    expect(profile()).toContain("import { CardHead, Detail, EmptyState, Icon } from './profile-ui'");
    expect(shared).toContain("className='mw-talent-profile-card-head mw-tp-card-head'");
    expect(shared).toContain("className='mw-talent-profile-detail'");
    expect(profile()).not.toContain('function Icon({ name, size = 16 }');
    expect(profile()).not.toContain("function CardHead({ icon, title, action }");
  });

  it('opens the booking calendar from an icon trigger', () => {
    const calendarSource = source('src/components/mediaworld/talent/booking-calendar.tsx');

    expect(calendarSource).toContain("aria-haspopup='dialog'");
    expect(calendarSource).toContain('aria-expanded={open}');
    expect(calendarSource).toContain("role='dialog'");
    expect(calendarSource).toContain("aria-label={t.prev}");
    expect(calendarSource).toContain("aria-label={t.next}");
    expect(calendarSource).toContain('disabled={past}');
    expect(calendarSource).toContain("event.key !== 'Escape'");
    expect(calendarSource).toContain('formatBookingDate');
    expect(profile()).toContain('<BookingCalendar');
    expect(profile()).toContain("variant='icon'");
  });
});
