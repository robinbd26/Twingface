'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { NETWORK_ERROR } from '@/lib/client/forms';
import BookingCalendar from './booking-calendar';

const PROJECT_TYPES = [
  { value: 'Film / TV Drama', en: 'Film / TV Drama', bn: 'ফিল্ম / টিভি নাটক' },
  { value: 'TVC / Commercial', en: 'TVC / Commercial', bn: 'টিভিসি / বিজ্ঞাপন' },
  { value: 'Natok / Web Series', en: 'Natok / Web Series', bn: 'নাটক / ওয়েব সিরিজ' },
  { value: 'Music Video', en: 'Music Video', bn: 'মিউজিক ভিডিও' },
  { value: 'Photo Shoot', en: 'Photo Shoot', bn: 'ফটোশুট' },
  { value: 'Other', en: 'Other', bn: 'অন্যান্য' },
] as const;

const TEXT = {
  en: {
    title: 'Booking / Availability',
    lead: (name: string) => `Send your preferred date and project type. This opens a message thread with ${name}.`,
    date: 'Select Date',
    projectType: 'Project Type',
    submit: 'Send Booking Request',
    sending: 'Sending…',
    dateRequired: 'Choose a date for the booking request.',
    datePast: 'Choose today or a later date.',
    note: 'Availability is confirmed in chat.',
    error: 'Unable to send the booking request.',
  },
  bn: {
    title: 'বুকিং / সময়সূচি',
    lead: (name: string) => `আপনার পছন্দের তারিখ ও প্রজেক্টের ধরন পাঠান। এটি ${name}-এর সঙ্গে একটি মেসেজ থ্রেড খুলবে।`,
    date: 'তারিখ বাছুন',
    projectType: 'প্রজেক্টের ধরন',
    submit: 'বুকিং রিকোয়েস্ট পাঠান',
    sending: 'পাঠানো হচ্ছে…',
    dateRequired: 'বুকিং রিকোয়েস্টের জন্য একটি তারিখ বাছুন।',
    datePast: 'আজ বা তার পরের তারিখ বাছুন।',
    note: 'সময়সূচি চ্যাটে নিশ্চিত করা হয়।',
    error: 'বুকিং রিকোয়েস্ট পাঠানো যায়নি।',
  },
} as const;

export default function BookingRequestCard({ username, name }: { username: string; name: string }) {
  const router = useRouter();
  const { language } = useMediaWorldLanguage();
  const t = TEXT[language];
  const [date, setDate] = useState('');
  const [projectType, setProjectType] = useState<string>(PROJECT_TYPES[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const dateInput = document.getElementById('mw-booking-date');
    if (!date) {
      setError(t.dateRequired);
      dateInput?.focus();
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(`${date}T00:00:00`) < today) {
      setError(t.datePast);
      dateInput?.focus();
      return;
    }

    setBusy(true);
    setError('');
    const start = await fetch(`/api/mediaworld/talent/${encodeURIComponent(username)}/message`, { method: 'POST' }).catch(() => null);
    if (!start) {
      setBusy(false);
      setError(language === 'bn' ? NETWORK_ERROR.bn : NETWORK_ERROR.en);
      return;
    }
    const startData = await start.json().catch(() => null) as { conversationId?: string; error?: string } | null;
    if (!start.ok || !startData?.conversationId) {
      setBusy(false);
      setError(startData?.error || t.error);
      return;
    }

    const content = `Booking request\nDate: ${date}\nProject type: ${projectType}`;
    const sent = await fetch(`/api/conversations/${startData.conversationId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content }),
    }).catch(() => null);
    if (!sent || !sent.ok) {
      setBusy(false);
      setError(t.error);
      return;
    }
    router.push(`/messages/${startData.conversationId}`);
  }

  return (
    <section id='booking' className='mw-talent-profile-card mw-booking-card'>
      <div className='mw-talent-profile-card-head mw-tp-card-head'>
        <h2>
          <span className='mw-tp-card-icon' aria-hidden='true'>
            <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} strokeLinecap='round' strokeLinejoin='round'>
              <rect x='3.5' y='5' width='17' height='15' rx='2' /><path d='M8 3v4M16 3v4M3.5 10h17' />
            </svg>
          </span>
          {t.title}
        </h2>
      </div>
      <p className='mw-booking-lead'>{t.lead(name)}</p>
      <form className='mw-booking-form' onSubmit={submit} noValidate>
        <label htmlFor='mw-booking-date'>{t.date}</label>
        <BookingCalendar
          id='mw-booking-date'
          value={date}
          bn={language === 'bn'}
          label={t.date}
          onChange={(iso) => {
            setDate(iso);
            setError('');
          }}
        />
        <label htmlFor='mw-booking-type'>{t.projectType}</label>
        <select
          id='mw-booking-type'
          name='projectType'
          value={projectType}
          onChange={(event) => setProjectType(event.target.value)}
        >
          {PROJECT_TYPES.map((item) => (
            <option key={item.value} value={item.value}>{language === 'bn' ? item.bn : item.en}</option>
          ))}
        </select>
        <button type='submit' className='mw-btn mw-btn-primary' disabled={busy} aria-busy={busy}>
          {busy ? t.sending : t.submit}
        </button>
      </form>
      {error ? <p className='mw-booking-error' role='alert'>{error}</p> : null}
      <p className='mw-booking-note'>{t.note}</p>
    </section>
  );
}
