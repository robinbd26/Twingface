'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MediaWorldLanguageToggle, useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { FormAlert } from '@/components/ui/form-field';
import { INPUT_CLASS, NETWORK_ERROR, readError, readFieldErrors, sendJson, type FieldErrors } from '@/lib/client/forms';
import type { AvailabilityBlockView, BookingView } from '@/lib/bookings/booking';
import {
  bookingStatusLabel,
  statusNotice,
  type BookingAction,
  type BookingStatusValue,
} from '@/lib/bookings/lifecycle';
import { dhakaDate, formatBdt, formatBookingRange, unitLabel } from '@/lib/bookings/pricing';
import type { RentalAvailabilityValue, RentalPriceUnit } from '@/lib/mediaworld/rental';

export type ProviderListing = {
  id: string;
  title: string;
  pricePaisa: number;
  priceUnit: RentalPriceUnit;
  priceCustom: string | null;
  availability: RentalAvailabilityValue;
  isActive: boolean;
  photoUrl: string | null;
};

export type PlacedBlock = AvailabilityBlockView & { listingId: string };

type Props = {
  renter: BookingView[];
  provider: BookingView[];
  isProvider: boolean;
  listings: ProviderListing[];
  blocks: PlacedBlock[];
};

type View = 'incoming' | 'requests' | 'availability';
type Tab = 'pending' | 'active' | 'past';

const ACTION_LABELS: Record<BookingAction, { bn: string; en: string }> = {
  approve: { bn: 'অনুমোদন ও নিশ্চিত করুন', en: 'Approve & confirm' },
  reject: { bn: 'প্রত্যাখ্যান', en: 'Reject' },
  cancel: { bn: 'বাতিল করুন', en: 'Cancel booking' },
  complete: { bn: 'সম্পন্ন করুন', en: 'Mark complete' },
};

const ACTION_ERRORS: Record<BookingAction, { bn: string; en: string }> = {
  approve: { bn: 'বুকিং নিশ্চিত করা যায়নি।', en: 'Unable to confirm the booking.' },
  reject: { bn: 'অনুরোধ প্রত্যাখ্যান করা যায়নি।', en: 'Unable to reject the request.' },
  cancel: { bn: 'বুকিং বাতিল করা যায়নি।', en: 'Unable to cancel the booking.' },
  complete: { bn: 'বুকিং সম্পন্ন করা যায়নি।', en: 'Unable to complete the booking.' },
};

const STATUS_TONE: Record<BookingStatusValue, string> = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

function actionsFor(status: BookingStatusValue, providerView: boolean): BookingAction[] {
  if (status === 'PENDING') return providerView ? ['approve', 'reject'] : ['cancel'];
  if (status === 'CONFIRMED') return providerView ? ['complete', 'cancel'] : ['cancel'];
  return [];
}

export default function ForRentBookings({ renter, provider, isProvider, listings, blocks }: Props) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const [view, setView] = useState<View>(isProvider ? 'incoming' : 'requests');
  const [tab, setTab] = useState<Tab>('pending');
  const [data, setData] = useState({ renter, provider });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const list = view === 'incoming' ? data.provider : data.renter;

  useEffect(() => {
    if (view === 'availability') return;
    let active = true;
    const box = view === 'incoming' ? 'provider' : 'renter';
    const load = async () => {
      const response = await fetch(`/api/bookings?box=${box}`).catch(() => null);
      if (!response?.ok || !active) return;
      const body = (await response.json().catch(() => null)) as { bookings?: BookingView[] } | null;
      if (Array.isArray(body?.bookings)) {
        setData((current) => ({ ...current, [box]: body.bookings as BookingView[] }));
      }
    };
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 60_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [view]);

  async function act(booking: BookingView, action: BookingAction) {
    setBusyId(booking.id);
    setBanner(null);
    const result = await sendJson(`/api/bookings/${booking.id}`, 'PATCH', {
      action,
      note: notes[booking.id]?.trim() || undefined,
    });
    setBusyId(null);

    if (!result.ok) {
      setBanner({
        tone: 'error',
        text: result.status === 0
          ? bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en
          : readError(result.json, ACTION_ERRORS[action], bn),
      });
      return;
    }

    const updated = result.json?.booking as BookingView | undefined;
    if (!updated) {
      setBanner({ tone: 'error', text: bn ? 'উত্তরটি পড়া যায়নি; পেজ রিফ্রেশ করুন।' : 'The response could not be read. Refresh the page.' });
      return;
    }

    const key = view === 'incoming' ? 'provider' : 'renter';
    setData((current) => ({ ...current, [key]: current[key].map((row) => (row.id === updated.id ? updated : row)) }));
    setNotes((current) => ({ ...current, [booking.id]: '' }));
    setBanner({
      tone: 'ok',
      text: typeof result.json?.message === 'string'
        ? result.json.message
        : bn ? 'বুকিং হালনাগাদ হয়েছে।' : 'Booking updated.',
    });
  }

  const groups: Record<Tab, BookingView[]> = {
    pending: list.filter((row) => row.status === 'PENDING'),
    active: list.filter((row) => row.status === 'CONFIRMED'),
    past: list.filter((row) => row.status === 'REJECTED' || row.status === 'CANCELLED' || row.status === 'COMPLETED'),
  };

  return (
    <section className='mw-bk'>
      <header className='mw-rent-manage-head'>
        <div>
          <p className='mw-rent-kicker'>{bn ? 'টুইংফেস ভাড়া ড্যাশবোর্ড' : 'TwingFace rental dashboard'}</p>
          <h1>{bn ? 'বুকিং ও প্রাপ্যতা' : 'Bookings & availability'}</h1>
        </div>
        <div className='mw-rent-head-actions'>
          <MediaWorldLanguageToggle />
          <nav className='mw-rent-links'>
            <Link href='/mediaworld' data-testid='for-rent-back-to-mediaworld'>{bn ? '← মিডিয়া ওয়ার্ল্ড' : '← Media World'}</Link>
            <Link href='/for-rent'>{bn ? 'ভাড়া বাজার' : 'Browse For Rent'}</Link>
            <Link href='/for-rent/dashboard'>{bn ? 'ভাড়া ড্যাশবোর্ড' : 'Rental dashboard'}</Link>
          </nav>
        </div>
      </header>

      <div className='mw-rent-tabs' role='tablist' aria-label={bn ? 'বুকিং দৃশ্য' : 'Booking views'}>
        {isProvider ? (
          <button
            role='tab'
            aria-selected={view === 'incoming'}
            className={view === 'incoming' ? 'active' : ''}
            type='button'
            onClick={() => { setView('incoming'); setTab('pending'); setBanner(null); }}
          >
            {bn ? 'পাওয়া অনুরোধ' : 'Incoming requests'}
          </button>
        ) : null}
        <button
          role='tab'
          aria-selected={view === 'requests'}
          className={view === 'requests' ? 'active' : ''}
          type='button'
          onClick={() => { setView('requests'); setTab('pending'); setBanner(null); }}
        >
          {bn ? 'আমার অনুরোধ' : 'My requests'}
        </button>
        {isProvider ? (
          <button
            role='tab'
            aria-selected={view === 'availability'}
            className={view === 'availability' ? 'active' : ''}
            type='button'
            onClick={() => { setView('availability'); setBanner(null); }}
          >
            {bn ? 'প্রাপ্যতা ব্যবস্থাপনা' : 'Manage availability'}
          </button>
        ) : null}
      </div>

      {banner ? <FormAlert message={banner.text} tone={banner.tone} /> : null}

      {view === 'availability' ? (
        <AvailabilityPanel listings={listings} initialBlocks={blocks} />
      ) : (
        <>
          <div className='mw-rent-tabs' role='tablist' aria-label={bn ? 'বুকিং অবস্থা' : 'Booking status'}>
            {(['pending', 'active', 'past'] as Tab[]).map((key) => (
              <button
                key={key}
                role='tab'
                aria-selected={tab === key}
                className={tab === key ? 'active' : ''}
                type='button'
                onClick={() => setTab(key)}
              >
                {key === 'pending'
                  ? bn ? `অপেক্ষমাণ (${groups.pending.length})` : `Pending (${groups.pending.length})`
                  : key === 'active'
                    ? bn ? `চলমান (${groups.active.length})` : `Active (${groups.active.length})`
                    : bn ? `পুরোনো (${groups.past.length})` : `Past (${groups.past.length})`}
              </button>
            ))}
          </div>

          {tab === 'pending' && view === 'incoming' ? (
            <p className='mw-bk-guard'>
              {bn
                ? 'অনুমোদন করার আগে সার্ভার প্রাপ্যতা যাচাই করে; অন্য কোনো নিশ্চিত বুকিং থাকলে অনুমোদন হবে না।'
                : 'Approving re-checks availability on the server. If another booking already holds these dates, the approval is refused.'}
            </p>
          ) : null}

          {groups[tab].length ? (
            <div className='mw-bk-list'>
              {groups[tab].map((booking) => {
                const providerView = view === 'incoming';
                const actions = actionsFor(booking.status, providerView);
                return (
                  <article key={booking.id} className='mw-bk-card'>
                    <div className='mw-bk-card-head'>
                      <Link href={`/for-rent/${booking.listing.id}`} className='mw-bk-card-title'>
                        {booking.listing.title}
                      </Link>
                      <span className={`mw-bk-pill ${STATUS_TONE[booking.status]}`}>{bookingStatusLabel(booking.status, bn)}</span>
                      <span className='mw-bk-when'>
                        {formatBookingRange(booking.startAt, booking.endAt, booking.priceUnit === 'PER_HOUR')}
                      </span>
                    </div>

                    <p className='mw-bk-total'>
                      {formatBdt(booking.totalPaisa, bn)}
                      <span>
                        {' '}· {formatBdt(booking.unitPricePaisa, bn)} / {unitLabel(booking.priceUnit, bn)}
                      </span>
                    </p>

                    {providerView ? (
                      <p className='mw-bk-who'>
                        {bn ? 'অনুরোধকারী: ' : 'Requested by '}
                        <Link href={`/${booking.renter.username}`}>{booking.renter.name} (@{booking.renter.username})</Link>
                      </p>
                    ) : null}

                    {booking.note ? <p className='mw-bk-note'>{booking.note}</p> : null}
                    {booking.decisionNote ? (
                      <p className='mw-bk-note'>
                        <strong>{bn ? 'প্রোভাইডারের মন্তব্য: ' : 'Provider note: '}</strong>
                        {booking.decisionNote}
                      </p>
                    ) : null}

                    <p className={`mw-bk-state ${STATUS_TONE[booking.status]}`}>{statusNotice(booking.status, bn)}</p>

                    {booking.history.length ? (
                      <details className='mw-bk-history'>
                        <summary>{bn ? 'স্ট্যাটাস ইতিহাস' : 'Status history'}</summary>
                        <ul>
                          {booking.history.map((entry) => (
                            <li key={entry.id}>
                              <span>
                                {entry.fromStatus
                                  ? `${bookingStatusLabel(entry.fromStatus, bn)} → ${bookingStatusLabel(entry.toStatus, bn)}`
                                  : bookingStatusLabel(entry.toStatus, bn)}
                              </span>
                              <span>{new Date(entry.createdAt).toLocaleString('en-BD', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })}</span>
                              <span>{entry.actor?.name ?? (bn ? 'সিস্টেম' : 'System')}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}

                    {actions.length ? (
                      <div className='mw-bk-actions'>
                        {providerView && booking.status === 'PENDING' ? (
                          <textarea
                            className={`${INPUT_CLASS} mw-bk-decision`}
                            value={notes[booking.id] ?? ''}
                            onChange={(event) => setNotes((current) => ({ ...current, [booking.id]: event.target.value }))}
                            maxLength={1000}
                            rows={2}
                            placeholder={bn ? 'সিদ্ধান্তের কারণ (ঐচ্ছিক)' : 'Decision note (optional)'}
                          />
                        ) : null}
                        {actions.map((action) => (
                          <button
                            key={action}
                            type='button'
                            className={action === 'approve' ? 'approve' : action === 'reject' || action === 'cancel' ? 'danger' : ''}
                            disabled={busyId === booking.id}
                            onClick={() => void act(booking, action)}
                          >
                            {ACTION_LABELS[action][bn ? 'bn' : 'en']}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className='mw-rent-empty'>
              <span>🗓</span>
              <strong>
                {tab === 'pending'
                  ? bn ? 'কোনো অপেক্ষমাণ অনুরোধ নেই' : 'No pending requests'
                  : tab === 'active'
                    ? bn ? 'এখন কোনো চলমান বুকিং নেই' : 'No active bookings'
                    : bn ? 'কোনো পুরোনো বুকিং নেই' : 'No past bookings'}
              </strong>
              <p>
                {view === 'incoming'
                  ? bn ? 'নতুন বুকিং অনুরোধ এলে এখানে দেখা যাবে।' : 'New booking requests from renters will appear here.'
                  : bn ? 'পছন্দের তালিকা থেকে তারিখ বেছে নিয়ে অনুরোধ পাঠান।' : 'Pick dates on a listing to send your first request.'}
              </p>
              <Link href='/for-rent'>{bn ? 'ভাড়া বাজার' : 'Browse For Rent'}</Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function AvailabilityPanel({ listings, initialBlocks }: { listings: ProviderListing[]; initialBlocks: PlacedBlock[] }) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const today = dhakaDate();
  const [blocks, setBlocks] = useState(initialBlocks);
  const [listingId, setListingId] = useState(listings[0]?.id ?? '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const listing = listings.find((row) => row.id === listingId) ?? null;
  const hourly = listing?.priceUnit === 'PER_HOUR';
  const rows = blocks.filter((block) => block.listingId === listingId);

  if (!listings.length) {
    return (
      <div className='mw-rent-empty'>
        <span>📦</span>
        <strong>{bn ? 'প্রাপ্যতা ব্যবস্থাপনার জন্য তালিকা দরকার' : 'A listing is needed to manage availability'}</strong>
        <p>{bn ? 'প্রথমে একটি সরঞ্জামের তালিকা তৈরি করুন।' : 'Create an equipment listing first.'}</p>
        <Link href='/for-rent/new'>{bn ? 'নতুন তালিকা' : 'New listing'}</Link>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!listing) return;
    setSaving(true);
    setBanner(null);
    setErrors({});
    const result = await sendJson(`/api/for-rent/${listing.id}/blocks`, 'POST', {
      startDate,
      endDate,
      startTime: hourly ? startTime || undefined : undefined,
      endTime: hourly ? endTime || undefined : undefined,
      reason: reason.trim() || undefined,
    });
    setSaving(false);

    if (!result.ok) {
      setErrors(readFieldErrors(result.json));
      setBanner({
        tone: 'error',
        text: result.status === 0
          ? bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en
          : readError(result.json, { bn: 'তারিখ বন্ধ করা যায়নি।', en: 'Unable to block those dates.' }, bn),
      });
      return;
    }

    const block = result.json?.block as AvailabilityBlockView | undefined;
    if (block) setBlocks((current) => [...current, { ...block, listingId: listing.id }]);
    setStartDate('');
    setEndDate('');
    setReason('');
    setBanner({ tone: 'ok', text: bn ? 'তারিখগুলো বন্ধ করা হয়েছে।' : 'Those dates are now blocked.' });
  }

  async function remove(block: PlacedBlock) {
    setDeletingId(block.id);
    setBanner(null);
    const result = await sendJson(`/api/for-rent/${block.listingId}/blocks/${block.id}`, 'DELETE');
    setDeletingId(null);
    if (!result.ok) {
      setBanner({
        tone: 'error',
        text: result.status === 0
          ? bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en
          : readError(result.json, { bn: 'ব্লকটি সরানো যায়নি।', en: 'Unable to remove the block.' }, bn),
      });
      return;
    }
    setBlocks((current) => current.filter((row) => row.id !== block.id));
  }

  return (
    <div className='mw-bk-availability'>
      <div className='mw-bk-availability-head'>
        {listing?.photoUrl ? <img className='mw-bk-avail-thumb' src={listing.photoUrl} alt='' loading='lazy' /> : null}
        <label className='mw-bk-select'>
          <span>{bn ? 'তালিকা' : 'Listing'}</span>
          <select value={listingId} onChange={(event) => { setListingId(event.target.value); setBanner(null); }}>
            {listings.map((row) => (
              <option key={row.id} value={row.id}>
                {row.title}{row.isActive ? '' : bn ? ' (লুকানো)' : ' (hidden)'}
              </option>
            ))}
          </select>
        </label>
        <Link className='mw-bk-back' href={listing ? `/for-rent/${listing.id}` : '/for-rent'}>{bn ? 'তালিকা দেখুন' : 'View listing'}</Link>
      </div>

      {banner ? <FormAlert message={banner.text} tone={banner.tone} /> : null}

      <form className='mw-bk-block-form' onSubmit={submit}>
        <h4>{bn ? 'তারিখ বন্ধ করুন' : 'Block dates'}</h4>
        <div className='mw-bk-block-grid'>
          <label>
            <span>{bn ? 'শুরুর তারিখ' : 'Start date'}</span>
            <input type='date' className={INPUT_CLASS} min={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
          </label>
          <label>
            <span>{bn ? 'শেষ তারিখ' : 'End date'}</span>
            <input type='date' className={INPUT_CLASS} min={startDate || today} value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
          </label>
          {hourly ? (
            <>
              <label>
                <span>{bn ? 'শুরুর সময়' : 'Start time'}</span>
                <input type='time' className={INPUT_CLASS} value={startTime} onChange={(event) => setStartTime(event.target.value)} />
              </label>
              <label>
                <span>{bn ? 'শেষের সময়' : 'End time'}</span>
                <input type='time' className={INPUT_CLASS} value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              </label>
            </>
          ) : null}
          <label className='wide'>
            <span>{bn ? 'কারণ (ঐচ্ছিক)' : 'Reason (optional)'}</span>
            <input className={INPUT_CLASS} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} />
          </label>
        </div>
        {Object.keys(errors).length ? <span className='mw-bk-field-error'>{Object.values(errors).flat().join(' ')}</span> : null}
        <p className='mw-bk-guard'>
          {bn
            ? 'নিশ্চিত বুকিং থাকা তারিখ বন্ধ করা যাবে না — আগে সেই বুকিং বাতিল করতে হবে।'
            : 'Dates that already carry a confirmed booking cannot be blocked. Cancel that booking first.'}
        </p>
        <button className='mw-rent-submit' type='submit' disabled={saving || !startDate || !endDate}>
          {saving ? (bn ? 'সংরক্ষণ হচ্ছে…' : 'Saving…') : bn ? 'তারিখ বন্ধ করুন' : 'Block these dates'}
        </button>
      </form>

      <div className='mw-bk-block-list'>
        <h4>{bn ? 'বন্ধ থাকা তারিখ' : 'Blocked dates'}</h4>
        {rows.length ? (
          <ul>
            {rows.map((block) => (
              <li key={block.id}>
                <div>
                  <strong>{formatBookingRange(block.startAt, block.endAt, hourly)}</strong>
                  {block.reason ? <p>{block.reason}</p> : null}
                </div>
                <button type='button' disabled={deletingId === block.id} onClick={() => void remove(block)}>
                  {bn ? 'সরান' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className='mw-bk-empty'>{bn ? 'এই তালিকায় কোনো তারিখ বন্ধ নেই।' : 'No dates are blocked for this listing.'}</p>
        )}
      </div>
    </div>
  );
}
