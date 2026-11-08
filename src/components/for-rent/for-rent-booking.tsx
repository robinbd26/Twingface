'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { Field, FormAlert } from '@/components/ui/form-field';
import { INPUT_CLASS, NETWORK_ERROR, postJson, readError, readFieldErrors, type FieldErrors } from '@/lib/client/forms';
import { bookingStatusLabel } from '@/lib/bookings/lifecycle';
import { dhakaDate, quoteBooking, quoteSummary, resolveBookingWindow } from '@/lib/bookings/pricing';
import type { RentalPriceUnit } from '@/lib/mediaworld/rental';

type Props = {
  listingId: string;
  pricePaisa: number;
  priceUnit: RentalPriceUnit;
  priceCustom: string | null;
  closed: boolean;
};

type CheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; competing: number }
  | { status: 'blocked'; reason: string }
  | { status: 'error'; reason: string };

type Created = { id: string; status: string };

export default function ForRentBooking({ listingId, pricePaisa, priceUnit, priceCustom, closed }: Props) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const hourly = priceUnit === 'PER_HOUR';
  const today = useMemo(() => dhakaDate(), []);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [check, setCheck] = useState<CheckState>({ status: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);

  const range = useMemo(
    () => resolveBookingWindow(priceUnit, { startDate, endDate, startTime: startTime || undefined, endTime: endTime || undefined }),
    [priceUnit, startDate, endDate, startTime, endTime],
  );

  const quote = useMemo(
    () => (range.ok ? quoteBooking({ priceUnit, pricePaisa }, range.window.startAt, range.window.endAt) : null),
    [range, priceUnit, pricePaisa],
  );

  useEffect(() => {
    if (!range.ok) {
      setCheck({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCheck({ status: 'checking' });
      const response = await fetch(`/api/for-rent/${listingId}/availability`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          startTime: hourly ? startTime : undefined,
          endTime: hourly ? endTime : undefined,
        }),
        signal: controller.signal,
      }).catch(() => null);
      if (controller.signal.aborted) return;
      if (!response) {
        setCheck({ status: 'error', reason: bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en });
        return;
      }
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        setCheck({
          status: 'error',
          reason: readError(body, { bn: 'প্রাপ্যতা যাচাই করা যায়নি।', en: 'Unable to check availability.' }, bn),
        });
        return;
      }
      if (body?.available === true) {
        setCheck({ status: 'available', competing: typeof body.competingRequests === 'number' ? body.competingRequests : 0 });
        return;
      }
      const reason = typeof body?.reason === 'string' ? body.reason : 'Those dates are not available.';
      setCheck({
        status: 'blocked',
        reason: reason.includes('blocked')
          ? bn ? 'প্রোভাইডার এই তারিখগুলো বন্ধ রেখেছেন।' : reason
          : bn ? 'এই তারিখগুলোতে অন্য একটি বুকিং ইতিমধ্যে নিশ্চিত হয়েছে।' : reason,
      });
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [listingId, startDate, endDate, startTime, endTime, hourly, range.ok, bn]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!range.ok || !quote?.ok) return;
    setSubmitting(true);
    setBanner(null);
    setErrors({});
    const result = await postJson(`/api/for-rent/${listingId}/bookings`, {
      startDate,
      endDate,
      startTime: hourly ? startTime : undefined,
      endTime: hourly ? endTime : undefined,
      note: note.trim() || undefined,
    });
    setSubmitting(false);

    if (result.ok) {
      const booking = result.json?.booking as { id?: unknown; status?: unknown } | undefined;
      if (typeof booking?.id === 'string') {
        setCreated({ id: booking.id, status: typeof booking.status === 'string' ? booking.status : 'PENDING' });
      }
      return;
    }

    setErrors(readFieldErrors(result.json));
    setBanner({
      tone: 'error',
      text: result.status === 0
        ? bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en
        : readError(result.json, { bn: 'বুকিং অনুরোধ পাঠানো যায়নি।', en: 'Unable to send the booking request.' }, bn),
    });
    if (result.status === 409) setCheck({ status: 'blocked', reason: bn ? 'নির্বাচিত তারিখগুলো এখন আর খালি নেই।' : 'Those dates are no longer open.' });
  }

  if (created) {
    return (
      <section className='mw-rent-booking mw-bk-success'>
        <h3 className='mw-rent-inquiry-title'>{bn ? 'অনুরোধ পাঠানো হয়েছে' : 'Request sent'}</h3>
        <span className='mw-bk-pill pending'>{bookingStatusLabel('PENDING', bn)}</span>
        <p className='mw-bk-note'>
          {bn
            ? 'এটি এখনো নিশ্চিত হয়নি। প্রোভাইডার প্রাপ্যতা যাচাই করে অনুমোদন করলে তবেই বুকিং নিশ্চিত হবে।'
            : 'This is not confirmed yet. The provider must verify availability and approve the request first.'}
        </p>
        <div className='mw-bk-success-links'>
          <Link href='/for-rent/bookings'>{bn ? 'আমার বুকিং দেখুন' : 'View my bookings'}</Link>
          <button type='button' onClick={() => setCreated(null)}>{bn ? 'আরেকটি অনুরোধ' : 'Request another slot'}</button>
        </div>
      </section>
    );
  }

  const disabled = closed || !range.ok || !quote?.ok || check.status === 'checking' || check.status === 'blocked' || submitting;

  return (
    <form className='mw-rent-booking' onSubmit={submit}>
      <h3 className='mw-rent-inquiry-title'>{bn ? 'বুকিং অনুরোধ' : 'Request a booking'}</h3>
      <p className='mw-bk-lead'>
        {bn
          ? 'তারিখ বেছে নিন। মোট ভাড়া স্বয়ংক্রিয়ভাবে হিসাব হবে; অনুরোধ পাঠানোর পরই প্রোভাইডার অনুমোদন দেবেন।'
          : 'Pick your dates and the total is calculated instantly. The provider reviews and approves every request.'}
      </p>
      {banner ? <FormAlert message={banner.text} tone={banner.tone} /> : null}
      {closed ? (
        <p className='mw-rent-closed'>
          {bn ? 'এই তালিকা এখন বুকিং নিচ্ছে না।' : 'This listing is not accepting bookings right now.'}
        </p>
      ) : null}

      <div className='mw-rent-two-col'>
        <Field id='startDate' label={bn ? 'শুরুর তারিখ' : 'Start date'} errors={errors}>
          <input
            id='startDate'
            type='date'
            className={INPUT_CLASS}
            min={today}
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </Field>
        <Field id='endDate' label={bn ? 'ফেরতের তারিখ' : 'Return date'} errors={errors}>
          <input
            id='endDate'
            type='date'
            className={INPUT_CLASS}
            min={startDate || today}
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            required
          />
        </Field>
      </div>

      {hourly ? (
        <div className='mw-rent-two-col'>
          <Field id='startTime' label={bn ? 'শুরুর সময়' : 'Start time'} errors={errors}>
            <input id='startTime' type='time' className={INPUT_CLASS} value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
          </Field>
          <Field id='endTime' label={bn ? 'শেষের সময়' : 'End time'} errors={errors}>
            <input id='endTime' type='time' className={INPUT_CLASS} value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
          </Field>
        </div>
      ) : null}

      <Field
        id='note'
        label={bn ? 'বার্তা (ঐচ্ছিক)' : 'Note (optional)'}
        errors={errors}
        hint={bn ? 'কোথায় ও কখন ব্যবহার করবেন লিখতে পারেন।' : 'Mention what you need it for and where.'}
      >
        <textarea id='note' className={`${INPUT_CLASS} mw-rent-textarea`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={3} />
      </Field>

      <div className='mw-bk-quote' aria-live='polite'>
        {!range.ok ? (
          <p className='mw-bk-quote-hint'>{bn ? 'শুরুর ও ফেরতের তারিখ বেছে নিলে মোট ভাড়া দেখা যাবে।' : 'Choose your dates to see the total rent.'}</p>
        ) : quote?.ok ? (
          <>
            <strong>{quoteSummary(quote, bn)}</strong>
            <span>{bn ? 'ভাড়া ছাড়া অন্যান্য খরচ প্রযোজ্য হতে পারে।' : 'Other costs are not included in this quote.'}</span>
            {priceCustom && priceUnit === 'CUSTOM' ? <span>{priceCustom}</span> : null}
          </>
        ) : (
          <p className='mw-bk-quote-hint'>{quote && !quote.ok ? quote.error : ''}</p>
        )}
        {check.status === 'checking' ? <span className='mw-bk-check'>{bn ? 'প্রাপ্যতা যাচাই হচ্ছে…' : 'Checking availability…'}</span> : null}
        {check.status === 'available' ? (
          <span className='mw-bk-check ok'>
            {bn ? 'এই তারিখগুলো এখন খালি আছে।' : 'These dates are open right now.'}
            {check.competing ? (bn ? ` আরও ${check.competing}টি অনুরোধ অপেক্ষায় আছে।` : ` ${check.competing} other request${check.competing === 1 ? ' is' : 's are'} pending.`) : null}
          </span>
        ) : null}
        {check.status === 'blocked' || check.status === 'error' ? <span className='mw-bk-check blocked'>{check.reason}</span> : null}
      </div>

      <p className='mw-bk-guard'>
        {bn
          ? 'নিশ্চিত হওয়ার আগে প্রোভাইডার যাচাই করবেন — অনুরোধ পাঠানোর সঙ্গে সঙ্গে কোনো তারিখ বুক হয় না।'
          : 'Nothing is locked by sending a request. The provider verifies the dates before anything is confirmed.'}
      </p>

      <button className='mw-rent-submit' type='submit' disabled={disabled}>
        {submitting
          ? bn ? 'পাঠানো হচ্ছে…' : 'Sending…'
          : bn ? 'বুকিং অনুরোধ পাঠান' : 'Send booking request'}
      </button>
    </form>
  );
}
