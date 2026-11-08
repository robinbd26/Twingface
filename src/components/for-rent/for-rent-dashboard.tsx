'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import MediaWorldLogoutButton from '@/components/mediaworld/talent/mediaworld-logout-button';
import { CardHead, Detail, EmptyState, Icon, type IconName } from '@/components/mediaworld/talent/profile-ui';
import { MediaWorldLanguageToggle, useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { FormAlert } from '@/components/ui/form-field';
import { NETWORK_ERROR, readError, sendJson } from '@/lib/client/forms';
import { formatRentalAvailability, formatRentalPrice, type LocalizedText } from '@/lib/mediaworld/labels';
import type { RentalAvailabilityValue, RentalPriceUnit } from '@/lib/mediaworld/rental';
import { bookingStatusLabel, type BookingStatusValue } from '@/lib/bookings/lifecycle';
import { formatBdt, formatBookingRange } from '@/lib/bookings/pricing';

export type RentItem = {
  id: string;
  title: string;
  pricePaisa: number;
  priceUnit: RentalPriceUnit;
  priceCustom: string | null;
  location: string;
  division: string | null;
  availability: RentalAvailabilityValue;
  isActive: boolean;
  updatedAt: string;
  photoUrl: string | null;
  categoryCode: string;
  categoryName: LocalizedText;
  subcategoryName: LocalizedText | null;
  inquiryCount: number;
};

export type RentInquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: 'PENDING' | 'REPLIED' | 'ARCHIVED';
  createdAt: string;
  listing: { id: string; title: string };
  sender: { name: string; username: string } | null;
};

export type RentBooking = {
  id: string;
  status: BookingStatusValue;
  startAt: string;
  endAt: string;
  priceUnit: RentalPriceUnit;
  totalPaisa: number | null;
  listingId: string;
  listingTitle: string;
  counterparty: string;
};

export type RentBlock = {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
  listingId: string;
  listingTitle: string;
};

export type RentAccount = {
  name: string;
  username: string | null;
  accountType: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  division: string | null;
  district: string | null;
};

export type RentProviderProfile = {
  businessName: string | null;
  ownerName: string;
  location: string;
  logoUrl: string | null;
  description: string;
  phone: string;
  email: string | null;
};

type Props = {
  account: RentAccount;
  provider: RentProviderProfile | null;
  listings: RentItem[];
  received: RentInquiry[];
  sent: RentInquiry[];
  providerBookings: RentBooking[];
  renterBookings: RentBooking[];
  blocks: RentBlock[];
};

const INQUIRY_STATUSES: RentInquiry['status'][] = ['PENDING', 'REPLIED', 'ARCHIVED'];
const INQUIRY_STATUS_LABELS: Record<RentInquiry['status'], LocalizedText> = {
  PENDING: { bn: 'নতুন', en: 'Pending' },
  REPLIED: { bn: 'উত্তর দেওয়া হয়েছে', en: 'Replied' },
  ARCHIVED: { bn: 'আর্কাইভ', en: 'Archived' },
};
const DATE = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });

export default function ForRentDashboard({
  account,
  provider,
  listings,
  received,
  sent,
  providerBookings,
  renterBookings,
  blocks,
}: Props) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const isProvider = Boolean(provider);

  const [rows, setRows] = useState(listings);
  const [inquiries, setInquiries] = useState({ received, sent });
  const [lane, setLane] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const displayName = provider?.businessName || account.name;
  const publicPageHref = account.username ? `/mediaworld/talent/${encodeURIComponent(account.username)}` : null;
  const avatarSrc = provider?.logoUrl || account.avatarUrl;
  const place = [...new Set([provider?.location, account.district, account.division].filter(Boolean))].join(', ');

  const lanes = useMemo(() => {
    const byCode = new Map<string, { code: string; name: LocalizedText; count: number }>();
    for (const item of rows) {
      const found = byCode.get(item.categoryCode);
      if (found) found.count += 1;
      else byCode.set(item.categoryCode, { code: item.categoryCode, name: item.categoryName, count: 1 });
    }
    return [...byCode.values()];
  }, [rows]);

  const visibleRows = lane ? rows.filter((item) => item.categoryCode === lane) : rows;
  const availableNow = rows.filter((item) => item.isActive && item.availability === 'AVAILABLE').length;
  const pendingInquiries = inquiries.received.filter((item) => item.status === 'PENDING').length;
  const openBookings = providerBookings.filter((item) => item.status === 'PENDING').length;
  const liveListings = rows.filter((item) => item.isActive).length;
  const areaFilled = rows.filter((item) => item.division).length;

  function fail(result: { status: number; json: Record<string, unknown> | null }, fallback: LocalizedText) {
    setBanner({
      tone: 'error',
      text: result.status === 0
        ? bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en
        : readError(result.json, fallback, bn),
    });
  }

  async function toggleActive(item: RentItem) {
    setBusy(true);
    setBanner(null);
    const result = await sendJson(`/api/for-rent/${item.id}`, 'PATCH', { isActive: !item.isActive });
    setBusy(false);
    if (!result.ok) return fail(result, { bn: 'পরিবর্তন করা যায়নি।', en: 'Unable to update the listing.' });
    setRows((current) => current.map((row) => (row.id === item.id ? { ...row, isActive: !item.isActive } : row)));
    setBanner({
      tone: 'ok',
      text: item.isActive
        ? (bn ? 'তালিকাটি এখন লুকানো।' : 'Listing hidden from the marketplace.')
        : (bn ? 'তালিকাটি এখন প্রকাশ্য।' : 'Listing is live again.'),
    });
  }

  async function remove(item: RentItem) {
    setBusy(true);
    setBanner(null);
    const result = await sendJson(`/api/for-rent/${item.id}`, 'DELETE');
    setBusy(false);
    setPendingDelete(null);
    if (!result.ok) return fail(result, { bn: 'মুছে ফেলা যায়নি।', en: 'Unable to delete the listing.' });
    setRows((current) => current.filter((row) => row.id !== item.id));
    setBanner({ tone: 'ok', text: bn ? 'তালিকাটি মুছে ফেলা হয়েছে।' : 'Listing deleted.' });
  }

  async function markStatus(inquiry: RentInquiry, status: RentInquiry['status']) {
    setBusy(true);
    setBanner(null);
    const result = await sendJson(`/api/for-rent/inquiries/${inquiry.id}`, 'PATCH', { status });
    setBusy(false);
    if (!result.ok) return fail(result, { bn: 'স্ট্যাটাস পরিবর্তন করা যায়নি।', en: 'Unable to update the inquiry.' });
    setInquiries((current) => ({
      ...current,
      received: current.received.map((row) => (row.id === inquiry.id ? { ...row, status } : row)),
    }));
  }

  const stats: { icon: IconName; key: string; label: string; value: number; hint?: string }[] = [
    { icon: 'box', key: 'items', label: bn ? 'ভাড়ার আইটেম' : 'Rent items', value: rows.length },
    { icon: 'check', key: 'available', label: bn ? 'এখন উপলব্ধ' : 'Available now', value: availableNow, hint: bn ? 'সক্রিয় ও খোলা আইটেম' : 'Live and open items' },
    { icon: 'message', key: 'inquiries', label: bn ? 'নতুন জিজ্ঞাসা' : 'Pending inquiries', value: pendingInquiries },
    { icon: 'calendar', key: 'bookings', label: bn ? 'বুকিং অনুরোধ' : 'Booking requests', value: openBookings },
  ];
  const cardClass = 'flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#0f172a]/80 p-5 shadow-sm transition-shadow hover:shadow-md';
  const headLink = (href: string, text: string, testId?: string) => (
    <Link href={href} data-testid={testId}>{text}</Link>
  );

  return (
    <div className='frd mx-auto! w-full max-w-[1440px] px-4 py-6 sm:px-6'>
      <header className='mw-tp-hero'>
        <div className='mw-tp-cover'>
          {account.coverUrl ? (
            <img src={account.coverUrl} alt='' width={1600} height={520} fetchPriority='high' />
          ) : null}
          <span className='mw-tp-cover-line' aria-hidden='true'>
            {bn ? 'যা লাগে শুটিংয়ে, তা এখানে ভাড়া মিলবে' : 'Everything a shoot needs, rented nearby'}
          </span>
        </div>
        <div className='mw-tp-identity'>
          <div className='mw-tp-avatar-wrap'>
            {avatarSrc ? (
              <img className='mw-tp-avatar' src={avatarSrc} alt='' width={112} height={112} />
            ) : (
              <span className='mw-tp-avatar mw-talent-avatar-fallback' aria-hidden='true'>{displayName.slice(0, 1).toUpperCase()}</span>
            )}
            <span
              className='mw-tp-verified'
              role='img'
              aria-label={bn ? 'ভাড়া সার্ভিস অ্যাকাউন্ট' : 'Rental service account'}
            >
              <Icon name='check' size={13} />
            </span>
          </div>

          <div className='mw-tp-who'>
            <h1>{displayName}</h1>
            {account.username ? <p className='mw-tp-handle' translate='no'>@{account.username}</p> : null}
            {place ? (
              <p className='mw-tp-place'>
                <Icon name='pin' size={13} /> {place}{bn ? ', বাংলাদেশ' : ', Bangladesh'}
              </p>
            ) : null}
            <span className='mw-tp-account'>{bn ? 'ভাড়া সার্ভিস' : 'Rental service'}</span>
          </div>

          <div className='mw-tp-actions'>
            <MediaWorldLogoutButton redirectTo='/login' />
            <Link className='mw-btn mw-btn-secondary' href={isProvider ? '/mediaworld/onboarding' : '/for-rent/register'}>
              {isProvider ? (bn ? 'প্রোভাইডার প্রোফাইল' : 'Provider profile') : (bn ? 'প্রোভাইডার হোন' : 'Become a provider')}
            </Link>
            {isProvider ? (
              <Link className='mw-btn mw-btn-accent' href='/for-rent/new' data-testid='for-rent-dashboard-add'>
                <Icon name='box' size={15} /> {bn ? 'পণ্য / সার্ভিস পোস্ট করুন' : 'Post product / service'}
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <nav className='frd-topbar' aria-label={bn ? 'ভাড়া ড্যাশবোর্ড নেভিগেশন' : 'Rental dashboard navigation'}>
        <div>
          <p className='mw-rent-kicker'>{bn ? 'টুইংফেস ভাড়া ড্যাশবোর্ড' : 'TwingFace rental dashboard'}</p>
          <p className='frd-topbar-note'>
            {isProvider
              ? (bn ? 'আপনার আইটেম, জিজ্ঞাসা ও বুকিং এক জায়গায়।' : 'Your items, inquiries and bookings in one place.')
              : (bn ? 'প্রোভাইডার না হলেও আপনার পাঠানো জিজ্ঞাসা ও ভাড়া এখানে।' : 'Even without a provider account, your sent inquiries and rentals live here.')}
          </p>
        </div>
        <MediaWorldLanguageToggle />
        <div className='mw-rent-links'>
          <Link href='/mediaworld' data-testid='for-rent-back-to-mediaworld'>{bn ? '← মিডিয়া ওয়ার্ল্ড' : '← Media World'}</Link>
          <Link href='/for-rent'>{bn ? 'ভাড়া বাজার' : 'Browse For Rent'}</Link>
          <Link href='/for-rent/bookings'>{bn ? 'বুকিং ও প্রাপ্যতা' : 'Bookings & availability'}</Link>
          {publicPageHref ? <Link href={publicPageHref}>{bn ? 'আমার পাবলিক পেজ' : 'My public page'}</Link> : null}
        </div>
      </nav>

      <section className='mw-tp-stats' aria-label={bn ? 'ড্যাশবোর্ড সারসংক্ষেপ' : 'Dashboard highlights'}>
        {stats.map((stat) => (
          <div className='mw-tp-stat' key={stat.key}>
            <span className='mw-tp-stat-icon' aria-hidden='true'><Icon name={stat.icon} size={17} /></span>
            <span className='mw-tp-stat-copy'>
              <span className='mw-tp-stat-label'>{stat.label}</span>
              <strong className='mw-tp-stat-value' title={stat.hint}>{stat.value}</strong>
            </span>
          </div>
        ))}
      </section>

      {banner ? <FormAlert message={banner.text} tone={banner.tone} /> : null}

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        <div className='flex min-w-0 flex-col gap-6 lg:col-span-2'>
          <section className={cardClass} id='items'>
            <CardHead
              icon='box'
              title={bn ? 'আমার ভাড়ার পণ্য ও সার্ভিস' : 'My rental products & services'}
              action={headLink('/for-rent', `${bn ? 'বাজারে দেখুন' : 'See them in the marketplace'} →`)}
            />

            {lanes.length > 1 ? (
              <div className='frd-lanes' role='group' aria-label={bn ? 'আইটেমের ক্যাটাগরি' : 'Item categories'}>
                <button type='button' className={lane === null ? 'frd-lane on' : 'frd-lane'} onClick={() => setLane(null)}>
                  {bn ? 'সব' : 'All'} <span>{rows.length}</span>
                </button>
                {lanes.map((entry) => (
                  <button
                    key={entry.code}
                    type='button'
                    className={lane === entry.code ? 'frd-lane on' : 'frd-lane'}
                    aria-pressed={lane === entry.code}
                    onClick={() => setLane(entry.code)}
                  >
                    {entry.name[bn ? 'bn' : 'en']} <span>{entry.count}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {isProvider ? (rows.length ? (
              visibleRows.length ? (
                <div className='mw-rent-rows'>
                  {visibleRows.map((item) => (
                    <article key={item.id} className='mw-rent-row'>
                      <Link className='mw-rent-row-thumb' href={`/for-rent/${item.id}`}>
                        {item.photoUrl ? <img src={item.photoUrl} alt='' loading='lazy' /> : <span>—</span>}
                      </Link>
                      <div className='mw-rent-row-main'>
                        <Link className='mw-rent-row-title' href={`/for-rent/${item.id}`}>{item.title}</Link>
                        <p className='mw-rent-row-meta'>
                          {formatRentalPrice(item.pricePaisa, item.priceUnit, item.priceCustom, bn)} · {item.location} · {formatRentalAvailability(item.availability, bn)}
                        </p>
                        <p className='mw-rent-row-sub'>
                          {item.categoryName[bn ? 'bn' : 'en']}
                          {item.subcategoryName ? ` · ${item.subcategoryName[bn ? 'bn' : 'en']}` : ''} · {DATE.format(new Date(item.updatedAt))}
                        </p>
                      </div>
                      <div className='mw-rent-row-side'>
                        <span className={`mw-rent-pill ${item.isActive ? 'open' : 'closed'}`}>
                          {item.isActive ? (bn ? 'সক্রিয়' : 'Live') : (bn ? 'লুকানো' : 'Hidden')}
                        </span>
                        <span className='mw-rent-row-count'>
                          {item.inquiryCount} {bn ? 'টি জিজ্ঞাসা' : item.inquiryCount === 1 ? 'inquiry' : 'inquiries'}
                        </span>
                        <div className='mw-rent-row-actions'>
                          <Link href={`/for-rent/${item.id}/edit`}>{bn ? 'সম্পাদনা' : 'Edit'}</Link>
                          <button type='button' disabled={busy} onClick={() => void toggleActive(item)}>
                            {item.isActive ? (bn ? 'লুকান' : 'Hide') : (bn ? 'প্রকাশ করুন' : 'Publish')}
                          </button>
                          {pendingDelete === item.id ? (
                            <>
                              <button className='danger' type='button' disabled={busy} onClick={() => void remove(item)}>
                                {bn ? 'নিশ্চিত করুন' : 'Confirm delete'}
                              </button>
                              <button type='button' onClick={() => setPendingDelete(null)}>{bn ? 'না' : 'Cancel'}</button>
                            </>
                          ) : (
                            <button className='danger' type='button' onClick={() => setPendingDelete(item.id)}>
                              {bn ? 'মুছুন' : 'Delete'}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                  <p className='mw-rent-danger-note'>
                    {bn
                      ? 'মুছে ফেললে তালিকা, এর ছবি ও পাওয়া জিজ্ঞাসা স্থায়ীভাবে চলে যাবে। আগে নিশ্চিত হন।'
                      : 'Deleting removes the listing, its photos and any inquiries it received. This cannot be undone.'}
                  </p>
                </div>
              ) : (
                <p className='frd-empty-line'>
                  {bn ? 'এই ক্যাটাগরিতে এখনো কিছু নেই। অন্য লেন বেছে নিন।' : 'Nothing in this lane yet — pick another category.'}
                </p>
              )
            ) : (
              <>
                <EmptyState
                  icon='box'
                  title={bn ? 'এখনো কোনো ভাড়ার আইটেম নেই' : 'No rent items yet'}
                  body={bn
                    ? 'গাড়ি, বাইক, লাইট, সাউন্ড সিস্টেম, প্রপ, ড্রোন বা শুটিং হাউস — যা ভাড়া দেন একটি করে যোগ করুন। প্রতিটি আইটেমই For Rent বাজারে আর আপনার পাবলিক প্রোফাইলে তার লোকেশনসহ দেখাবে।'
                    : 'Add one item per thing you rent out — car, bike, light, sound system, props, drone or shooting house. Each one shows up in the For Rent marketplace and on your public profile with its own location.'}
                />
                <Link className='mw-btn mw-btn-primary mw-btn-block' href='/for-rent/new'>{bn ? 'পণ্য / সার্ভিস পোস্ট করুন' : 'Post your first product / service'}</Link>
              </>
            )) : (
              <>
                <EmptyState
                  icon='briefcase'
                  title={bn ? 'আপনি এখনো প্রোভাইডার নন' : 'You are not a rental provider yet'}
                  body={bn
                    ? 'প্রোভাইডার অ্যাকাউন্ট খুললে আইটেম পোস্ট করতে পারবেন এবং সেগুলো For Rent বাজারে দেখাবে।'
                    : 'Open a provider account to post items, and they appear in the For Rent marketplace.'}
                />
                <Link className='mw-btn mw-btn-primary mw-btn-block' href='/for-rent/register'>{bn ? 'প্রোভাইডার অ্যাকাউন্ট খুলুন' : 'Open a provider account'}</Link>
              </>
            )}
          </section>

          <section className={cardClass} id='bookings'>
            <CardHead
              icon='calendar'
              title={bn ? 'বুকিং অনুরোধ' : 'Booking requests'}
              action={headLink('/for-rent/bookings', `${bn ? 'সব বুকিং' : 'Manage bookings'} →`)}
            />
            {providerBookings.length ? (
              <div className='frd-lines'>
                {providerBookings.slice(0, 6).map((booking) => (
                  <div className='frd-line' key={booking.id}>
                    <strong>{booking.counterparty}</strong>
                    <span className='frd-line-sep'>·</span>
                    <Link href={`/for-rent/${booking.listingId}`}>{booking.listingTitle}</Link>
                    <span className={`mw-rent-pill ${booking.status === 'PENDING' ? 'closed' : 'open'}`}>
                      {bookingStatusLabel(booking.status, bn)}
                    </span>
                    <span className='frd-line-tail'>
                      {formatBookingRange(booking.startAt, booking.endAt, booking.priceUnit === 'PER_HOUR')} · {formatBdt(booking.totalPaisa, bn)}
                    </span>
                  </div>
                ))}
                <p className='frd-note'>
                  {bn
                    ? 'অনুমোদন বা প্রত্যাখ্যান বুকিং পেজে হয় — এখানে শুধু সারসংক্ষেপ।'
                    : 'Approving and rejecting stays on the bookings page — this is a summary.'}
                </p>
              </div>
            ) : (
              <p className='frd-note'>
                {bn ? 'এখনো কোনো বুকিং অনুরোধ আসেনি।' : 'No booking requests on your items yet.'}
              </p>
            )}
          </section>

          <section className={cardClass} id='inquiries'>
            <CardHead
              icon='message'
              title={bn ? 'জিজ্ঞাসা' : 'Inquiries'}
              action={(
                <span className='frd-card-meta'>
                  {isProvider ? `${bn ? 'পাওয়া' : 'Received'} ${inquiries.received.length} · ${bn ? 'পাঠানো' : 'Sent'} ${inquiries.sent.length}` : `${bn ? 'পাঠানো' : 'Sent'} ${inquiries.sent.length}`}
                </span>
              )}
            />

            {isProvider && inquiries.received.length ? (
              <div className='frd-lines'>
                {inquiries.received.slice(0, 6).map((inquiry) => (
                  <div className='frd-line' key={inquiry.id}>
                    <strong>{inquiry.name}</strong>
                    <span className='frd-line-sep'>·</span>
                    <Link href={`/for-rent/${inquiry.listing.id}`}>{inquiry.listing.title}</Link>
                    <span className={`mw-rent-pill ${inquiry.status === 'PENDING' ? 'closed' : 'open'}`}>
                      {INQUIRY_STATUS_LABELS[inquiry.status][bn ? 'bn' : 'en']}
                    </span>
                    <span className='frd-line-tail'>{DATE.format(new Date(inquiry.createdAt))}</span>
                    <span className='frd-line-actions'>
                      {INQUIRY_STATUSES.filter((status) => status !== inquiry.status).map((status) => (
                        <button key={status} type='button' disabled={busy} onClick={() => void markStatus(inquiry, status)}>
                          {status === 'REPLIED'
                            ? (bn ? 'উত্তর দিয়েছি' : 'Mark replied')
                            : status === 'ARCHIVED'
                              ? (bn ? 'আর্কাইভ' : 'Archive')
                              : (bn ? 'আবার খুলুন' : 'Reopen')}
                        </button>
                      ))}
                    </span>
                  </div>
                ))}
                <p className='frd-note'>
                  {bn
                    ? 'জিজ্ঞাসার উত্তর এখন ইমেইল/ফোনেই দিতে হয় — প্ল্যাটফর্মে রিপ্লাই থ্রেড নেই।'
                    : 'Replies still happen over email or phone — there is no reply thread on the platform yet.'}
                </p>
              </div>
            ) : (
              <p className='frd-note'>
                {isProvider
                  ? (bn ? 'এখনো কোনো জিজ্ঞাসা পাননি।' : 'No inquiries received yet.')
                  : (bn ? 'পাঠানো জিজ্ঞাসা এখনো নেই।' : 'You have not sent any inquiries yet.')}
              </p>
            )}

            {inquiries.sent.length ? (
              <div className='frd-lines'>
                <p className='frd-subhead'>{bn ? 'আপনি যেগুলোতে জিজ্ঞাসা করেছেন' : 'Items you inquired about'}</p>
                {inquiries.sent.slice(0, 5).map((inquiry) => (
                  <div className='frd-line' key={inquiry.id}>
                    <Link href={`/for-rent/${inquiry.listing.id}`}>{inquiry.listing.title}</Link>
                    <span className={`mw-rent-pill ${inquiry.status === 'PENDING' ? 'closed' : 'open'}`}>
                      {INQUIRY_STATUS_LABELS[inquiry.status][bn ? 'bn' : 'en']}
                    </span>
                    <span className='frd-line-tail'>{DATE.format(new Date(inquiry.createdAt))}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <aside className='flex min-w-0 flex-col gap-6 lg:col-span-1'>
          <section className={cardClass} id='provider'>
            <CardHead
              icon='briefcase'
              title={bn ? 'প্রোভাইডার প্রোফাইল' : 'Provider profile'}
              action={isProvider ? headLink('/mediaworld/onboarding', `${bn ? 'সম্পাদনা' : 'Edit'} →`) : null}
            />
            {provider ? (
              <>
                <div className='mw-talent-profile-org'>
                  {provider.logoUrl ? (
                    <img className='mw-talent-profile-logo' src={provider.logoUrl} alt='' width={78} height={78} loading='lazy' />
                  ) : null}
                  <div className='mw-talent-profile-facts'>
                    <Detail label={bn ? 'প্রতিষ্ঠান' : 'Business'} value={provider.businessName || (bn ? 'নাম দেওয়া হয়নি' : 'Not set')} />
                    <Detail label={bn ? 'মালিক' : 'Owner'} value={provider.ownerName} />
                    <Detail label={bn ? 'বেস লোকেশন' : 'Base location'} value={provider.location} />
                    <Detail label={bn ? 'ফোন' : 'Phone'} value={provider.phone} />
                    <Detail label={bn ? 'ইমেইল' : 'Email'} value={provider.email || (bn ? 'নেই' : 'Not set')} />
                  </div>
                </div>
                {provider.description ? <p className='mw-talent-profile-desc'>{provider.description}</p> : null}
              </>
            ) : (
              <p className='frd-empty-line'>
                {bn ? 'প্রোভাইডার প্রোফাইল এখনো খোলা হয়নি।' : 'No provider profile has been opened on this account yet.'}
              </p>
            )}
            <p className='frd-note'>
              {bn
                ? 'আপনার পাবলিক পেজে শুধু প্রতিষ্ঠানের নাম, লোগো, বেস লোকেশন ও আইটেম দেখায় — অ্যাকাউন্টের ফোন/ইমেইল সেখানে যায় না।'
                : 'Your public page shows the business name, logo, base location and items only — your account phone and email are never published with a listing.'}
            </p>
          </section>

          <section className={cardClass} id='visibility'>
            <CardHead icon='megaphone' title={bn ? 'আইটেম কোথায় দেখায়' : 'Where your items show up'} />
            <dl className='frd-facts'>
              <div>
                <dt>{bn ? 'For Rent বাজার' : 'For Rent marketplace'}</dt>
                <dd><Link href='/for-rent'>{liveListings} {bn ? 'টি লাইভ' : 'live'}</Link></dd>
              </div>
              <div>
                <dt>{bn ? 'আপনার পাবলিক প্রোভাইডার পেজ' : 'Your public provider page'}</dt>
                <dd>{publicPageHref ? <Link href={publicPageHref}>{bn ? 'দেখুন' : 'Open'}</Link> : (bn ? 'ইউজারনেম নেই' : 'No username yet')}</dd>
              </div>
              <div>
                <dt>{bn ? 'ডিভিশন/জেলা ফিল্টারে ধরে' : 'Found by division / district filter'}</dt>
                <dd>{areaFilled} / {rows.length}</dd>
              </div>
            </dl>
            {isProvider && areaFilled < rows.length ? (
              <p className='frd-note'>
                {bn
                  ? 'যেসব আইটেমে ডিভিশন/জেলা দেওয়া নেই, এলাকা অনুযায়ী খোঁজায় সেগুলো বাদ পড়ে — সম্পাদনা থেকে পূরণ করুন।'
                  : 'Listings without a division or district are skipped when buyers filter by area — fill them in from Edit.'}
              </p>
            ) : null}
          </section>

          <section className={cardClass} id='availability'>
            <CardHead
              icon='clock'
              title={bn ? 'প্রাপ্যতা' : 'Availability'}
              action={headLink('/for-rent/bookings', `${bn ? 'ব্যবস্থাপনা' : 'Manage'} →`)}
            />
            {blocks.length ? (
              <div className='frd-lines'>
                {blocks.slice(0, 5).map((block) => (
                  <div className='frd-line' key={block.id}>
                    <Link href={`/for-rent/${block.listingId}`}>{block.listingTitle}</Link>
                    <span className='frd-line-tail'>
                      {formatBookingRange(block.startAt, block.endAt)}
                      {block.reason ? ` · ${block.reason}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className='frd-note'>
                {bn ? 'কোনো তারিখ ব্লক করা নেই।' : 'No blocked dates — every item is open unless booked.'}
              </p>
            )}
          </section>

          {renterBookings.length ? (
            <section className={cardClass} id='renting'>
              <CardHead
                icon='grid'
                title={bn ? 'আমি যা ভাড়া নিয়েছি' : 'What I am renting'}
                action={headLink('/for-rent/bookings', `${bn ? 'সব' : 'All'} →`)}
              />
              <div className='frd-lines'>
                {renterBookings.slice(0, 5).map((booking) => (
                  <div className='frd-line' key={booking.id}>
                    <Link href={`/for-rent/${booking.listingId}`}>{booking.listingTitle}</Link>
                    <span className={`mw-rent-pill ${booking.status === 'PENDING' ? 'closed' : 'open'}`}>
                      {bookingStatusLabel(booking.status, bn)}
                    </span>
                    <span className='frd-line-tail'>{formatBookingRange(booking.startAt, booking.endAt)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
