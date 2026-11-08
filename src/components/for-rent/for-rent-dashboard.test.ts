import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const dashboard = source('src/components/for-rent/for-rent-dashboard.tsx');
const page = source('src/app/(main)/for-rent/dashboard/page.tsx');
const manage = source('src/app/(main)/for-rent/manage/page.tsx');
const profileSource = source('src/components/mediaworld/talent/talent-profile.tsx');
const css = source('src/app/dashboard.css');

describe('For Rent dashboard component', () => {
  it('is a client component laid out like the talent profile', () => {
    expect(dashboard).toContain("'use client';");
    expect(dashboard).toContain("className='mw-tp-hero'");
    expect(dashboard).toContain("className='mw-tp-cover'");
    expect(dashboard).toContain("className='mw-tp-identity'");
    expect(dashboard).toContain("className='mw-tp-stats'");
    expect(dashboard).toContain('<MediaWorldLanguageToggle />');
    expect(dashboard).toContain("import { CardHead, Detail, EmptyState, Icon, type IconName } from '@/components/mediaworld/talent/profile-ui'");
    expect(dashboard).toContain('grid grid-cols-1 gap-6 lg:grid-cols-3');
    expect(dashboard).toContain('lg:col-span-2');
    expect(dashboard).toContain('lg:col-span-1');
    expect(dashboard).toContain('mx-auto! w-full max-w-[1440px] px-4 py-6 sm:px-6');
    expect(dashboard).toContain('flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#0f172a]/80 p-5 shadow-sm transition-shadow hover:shadow-md');
    expect(profileSource).toContain('flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#0f172a]/80 p-5 shadow-sm transition-shadow hover:shadow-md');
  });

  it('uses the shared card head, icons and detail rows instead of a second card design', () => {
    const shared = source('src/components/mediaworld/talent/profile-ui.tsx');

    for (const marker of ['<CardHead', 'mw-tp-stat-icon', 'mw-talent-profile-facts', '<Detail', '<EmptyState']) {
      expect(dashboard).toContain(marker);
    }
    expect(shared).toContain('export function Icon');
    expect(shared).toContain('export function CardHead');
    expect(shared).toContain('export function Detail');
    expect(shared).toContain('export function EmptyState');
    expect(profileSource).toContain("import { CardHead, Detail, EmptyState, Icon } from './profile-ui'");
    expect(profileSource).not.toContain("function CardHead({ icon, title, action }");
    expect(css).not.toContain('.frd-card{');
    expect(css).not.toContain('.frd-grid{');
    expect(css).not.toContain('.frd-col{');
  });

  it('reuses the rental row classes instead of inventing a second list design', () => {
    expect(dashboard).toContain("className='mw-rent-rows'");
    expect(dashboard).toContain("className='mw-rent-row'");
    expect(dashboard).toContain("className={`mw-rent-pill ${item.isActive ? 'open' : 'closed'}`}");
    expect(dashboard).toContain("className={lane === entry.code ? 'frd-lane on' : 'frd-lane'}");
  });

  it('shows the four real counts and no invented views or rating', () => {
    for (const label of ['Rent items', 'Available now', 'Pending inquiries', 'Booking requests']) {
      expect(dashboard).toContain(label);
    }
    expect(dashboard).toContain('rows.filter((item) => item.isActive && item.availability === \'AVAILABLE\').length');
    expect(dashboard).not.toMatch(/views|totalViews|\brating\b|★/i);
  });

  it('routes every action to a route that exists', () => {
    expect(dashboard).toContain("<MediaWorldLogoutButton redirectTo='/login' />");
    expect(dashboard).toContain("href='/for-rent/register'");
    expect(dashboard).toContain("href='/for-rent/new'");
    expect(dashboard).toContain("href='/for-rent/bookings'");
    expect(dashboard).toContain("data-testid='for-rent-dashboard-add'");
    expect(dashboard).toContain("<Link href='/mediaworld' data-testid='for-rent-back-to-mediaworld'>");
    expect(dashboard).toContain('href={`/for-rent/${item.id}/edit`}');
    expect(dashboard).toContain('`/mediaworld/talent/${encodeURIComponent(account.username)}`');
    expect(dashboard).toContain('href={publicPageHref}');
  });

  it('drives the listing and inquiry mutations through the real APIs', () => {
    expect(dashboard).toContain("sendJson(`/api/for-rent/${item.id}`, 'PATCH', { isActive: !item.isActive })");
    expect(dashboard).toContain("sendJson(`/api/for-rent/${item.id}`, 'DELETE')");
    expect(dashboard).toContain("sendJson(`/api/for-rent/inquiries/${inquiry.id}`, 'PATCH', { status })");
  });

  it('gates the destructive delete behind an explicit confirm step', () => {
    expect(dashboard).toContain('const [pendingDelete, setPendingDelete] = useState<string | null>(null)');
    expect(dashboard).toContain('onClick={() => setPendingDelete(item.id)}');
    expect(dashboard).toContain('onClick={() => void remove(item)}');
    expect(dashboard).toContain('Confirm delete');
    expect(dashboard).toContain('নিশ্চিত করুন');
    expect(dashboard).toContain('This cannot be undone.');
  });

  it('gives renters without a provider account an honest empty state, not a fake item list', () => {
    expect(dashboard).toContain('You are not a rental provider yet');
    expect(dashboard).toContain('আপনি এখনো প্রোভাইডার নন');
    expect(dashboard).toContain("href='/for-rent/register'");
    expect(dashboard).toContain('No rent items yet');
    expect(dashboard).toContain('এখনো কোনো ভাড়ার আইটেম নেই');
  });

  it('states the reply-thread limitation instead of pretending replies happen here', () => {
    expect(dashboard).toContain('there is no reply thread on the platform yet');
    expect(dashboard).toContain('Approving and rejecting stays on the bookings page');
  });

  it('labels every string in both languages', () => {
    expect(dashboard).toContain("const bn = language === 'bn';");
    for (const needle of [
      'Post product / service', 'My rental products & services', 'Booking requests', 'Inquiries', 'Provider profile',
      'Where your items show up', 'Availability', 'Rental service', 'Open a provider account',
      'Mark replied', 'Archive', 'Reopen', 'Browse For Rent',
    ]) {
      expect(dashboard).toContain(needle);
    }
    for (const bnText of [
      'ভাড়ার আইটেম', 'এখন উপলব্ধ', 'নতুন জিজ্ঞাসা', 'বুকিং অনুরোধ', 'প্রোভাইডার প্রোফাইল', 'মুছুন', 'সম্পাদনা',
      'পণ্য / সার্ভিস পোস্ট করুন', 'আমার ভাড়ার পণ্য ও সার্ভিস',
    ]) {
      expect(dashboard).toContain(bnText);
    }
  });

  it('hands the provider a post product/service action that reaches the real listing form', () => {
    expect(dashboard).toContain("<Link className='mw-btn mw-btn-accent' href='/for-rent/new' data-testid='for-rent-dashboard-add'>");
    expect(dashboard).toContain("href='/for-rent/new'>{bn ? 'পণ্য / সার্ভিস পোস্ট করুন' : 'Post your first product / service'}");
    expect(source('src/app/(main)/for-rent/new/page.tsx')).toContain('ForRentListingForm');
    expect(profileSource).toContain("href={listingPostHref} data-testid='rental-post-listing'");
    expect(profileSource).toContain("const listingPostHref = provider ? '/for-rent/new' : '/for-rent/register'");
    expect(profileSource).toContain("data-testid='rental-post-listing-empty'");
    expect(profileSource).toContain("'পণ্য / সার্ভিস পোস্ট করুন'");
  });

  it('shows the rental card on the public profile with an honest empty state', () => {
    expect(profileSource).toContain("profile.accountType === 'RENTAL' ?");
    expect(profileSource).toContain("'ভাড়ার পণ্য ও সার্ভিস'");
    expect(profileSource).toContain("'Rental products & services'");
    expect(profileSource).toContain('You have not posted a rental item yet');
    expect(profileSource).toContain('আপনার এখনো কোনো ভাড়ার পণ্য পোস্ট করা নেই');
    expect(profileSource).toContain('Complete the rental provider profile first');
    expect(profileSource).toContain('<ForRentCard key={listing.id} listing={listing} />');
  });

  it('keeps the provider contact fields private on the dashboard, never published with a listing', () => {
    expect(dashboard).toContain('your account phone and email are never published');
    expect(dashboard).toContain('অ্যাকাউন্টের ফোন/ইমেইল সেখানে যায় না');
  });
});

describe('For Rent dashboard route', () => {
  it('requires a signed-in account and reads every lane from the database', () => {
    expect(page).toContain("import { getCurrentUser } from '@/lib/auth'");
    expect(page).toContain('const user = await getCurrentUser();');
    expect(page).toContain("redirect('/login')");
    expect(page).toContain('rentalListingCardSelect');
    expect(page).toContain('bookingListSelect');
    expect(page).toContain('availabilityBlockSelect');
    expect(page).toContain('const [listingRows, receivedRows, sentRows, providerBookingRows, renterBookingRows, blockRows] = await Promise.all([');
  });

  it('does not treat missing account data as a crash: an absent account row redirects', () => {
    expect(page).toContain('const account = await prisma.user.findUnique(');
    expect(page).toContain('if (!account) redirect(\'/login\');');
  });

  it('keeps the sent and received inquiry lists honest about who sees the sender', () => {
    expect(page).toContain('toInquiry(row, true)');
    expect(page).toContain('toInquiry(row, false)');
    expect(page).toContain("sender: showSender ? row.user : null");
  });

  it('wraps the dashboard in the dark shell plus the language provider', () => {
    expect(page).toContain("className='app-shell page-enter'");
    expect(page).toContain("data-theme='dark'");
    expect(page).toContain('<MediaWorldLanguageProvider>');
    expect(page).toContain('<DashboardNavbar user={user} />');
    expect(page).toContain("className='mw-rent-page max-w-none! px-0! py-0!'");
  });

  it('reads the account cover image for the profile-style hero', () => {
    expect(page).toContain('coverImage: true');
    expect(page).toContain('coverUrl: account.coverImage');
    expect(dashboard).toContain('account.coverUrl');
  });

  it('ships scoped styles for the topbar, lanes, lines and facts', () => {
    for (const selector of [
      '.frd-topbar', '.frd-lanes', '.frd-lane', '.frd-lines', '.frd-line', '.frd-line-tail',
      '.frd-line-actions', '.frd-subhead', '.frd-facts', '.frd-note', '.frd-empty-line',
      '.mw-tp-head-links',
    ]) {
      expect(css).toContain(selector);
    }
  });
});

describe('the old manage surface is folded into the dashboard', () => {
  it('deletes the standalone manage component', () => {
    expect(existsSync(resolve(process.cwd(), 'src/components/for-rent/for-rent-manage.tsx'))).toBe(false);
  });

  it('keeps the manage URL alive as a redirect so bookmarks still land', () => {
    expect(manage).toContain("redirect('/for-rent/dashboard')");
  });

  it('points the dashboard at a provider account and the marketplace', () => {
    expect(dashboard).toContain("href={isProvider ? '/mediaworld/onboarding' : '/for-rent/register'}");
    expect(dashboard).toContain("href='/for-rent'");
  });
});
