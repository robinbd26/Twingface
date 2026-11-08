'use client';

import { useEffect, useRef, useState } from 'react';

const TEXT = {
  en: {
    placeholder: 'Choose a date',
    calendar: 'Booking calendar',
    prev: 'Previous month',
    next: 'Next month',
    clear: 'Clear date',
  },
  bn: {
    placeholder: 'তারিখ বাছুন',
    calendar: 'বুকিং ক্যালেন্ডার',
    prev: 'আগের মাস',
    next: 'পরের মাস',
    clear: 'তারিখ মুছুন',
  },
} as const;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseIso(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function formatBookingDate(iso: string, bn: boolean) {
  const date = parseIso(iso);
  if (!date) return '';
  return new Intl.DateTimeFormat(bn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function CalendarGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
      <rect x='3.5' y='5' width='17' height='15' rx='2' />
      <path d='M8 3v4M16 3v4M3.5 10h17' />
    </svg>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
      {direction === 'left' ? <path d='m14.5 5-7 7 7 7' /> : <path d='m9.5 5 7 7-7 7' />}
    </svg>
  );
}

type Props = {
  value: string;
  onChange: (iso: string) => void;
  bn: boolean;
  label?: string;
  id?: string;
  variant?: 'field' | 'icon';
};

export default function BookingCalendar({ value, onChange, bn, label, id, variant = 'field' }: Props) {
  const t = TEXT[bn ? 'bn' : 'en'];
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => startOfMonth(value ? parseIso(value) ?? new Date() : new Date()));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const todayIso = toIso(today);
  const minMonth = startOfMonth(today);
  const canGoBack = view.getFullYear() > minMonth.getFullYear()
    || (view.getFullYear() === minMonth.getFullYear() && view.getMonth() > minMonth.getMonth());

  const locale = bn ? 'bn-BD' : 'en-GB';
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(view);
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => weekdayFormatter.format(new Date(2024, 0, 7 + index)));
  const dayNumber = new Intl.NumberFormat(locale);

  const firstWeekday = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => toIso(new Date(view.getFullYear(), view.getMonth(), index + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function selectDay(iso: string) {
    onChange(iso);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function closeAndFocus() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  const triggerClass = variant === 'icon'
    ? 'grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-sky-400 transition-colors hover:border-sky-500 hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400'
    : 'flex w-full items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';

  return (
    <div ref={rootRef} className='relative'>
      <button
        ref={triggerRef}
        id={id}
        type='button'
        className={triggerClass}
        aria-haspopup='dialog'
        aria-expanded={open}
        aria-label={label ?? t.calendar}
        title={t.calendar}
        onClick={() => {
          setOpen((current) => {
            const next = !current;
            if (next) setView(startOfMonth(value ? parseIso(value) ?? new Date() : new Date()));
            return next;
          });
        }}
      >
        {variant === 'icon' ? (
          <CalendarGlyph />
        ) : (
          <>
            <span className={`text-[13px] font-semibold ${value ? 'text-slate-100' : 'text-slate-500'}`}>
              {value ? formatBookingDate(value, bn) : t.placeholder}
            </span>
            <span className='text-sky-400' aria-hidden='true'><CalendarGlyph /></span>
          </>
        )}
      </button>

      {open ? (
        <div
          ref={dialogRef}
          role='dialog'
          aria-label={t.calendar}
          tabIndex={-1}
          className='absolute right-0 top-[calc(100%+8px)] z-40 w-[min(288px,calc(100vw-48px))] rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl shadow-slate-950/60 focus:outline-none'
        >
          <div className='flex items-center justify-between gap-2 pb-2'>
            <button
              type='button'
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              disabled={!canGoBack}
              aria-label={t.prev}
              className='grid h-7 w-7 place-items-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition-colors hover:border-sky-500 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40'
            >
              <Chevron direction='left' />
            </button>
            <span className='text-xs font-bold text-slate-200' aria-live='polite'>{monthLabel}</span>
            <button
              type='button'
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              aria-label={t.next}
              className='grid h-7 w-7 place-items-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition-colors hover:border-sky-500 hover:text-sky-300'
            >
              <Chevron direction='right' />
            </button>
          </div>

          <div className='grid grid-cols-7 gap-1'>
            {weekdayLabels.map((weekday) => (
              <span key={weekday} className='grid h-7 place-items-center text-[10px] font-bold uppercase tracking-wide text-slate-500'>
                {weekday}
              </span>
            ))}
            {cells.map((iso, index) => {
              if (!iso) return <span key={`blank-${index}`} aria-hidden='true' />;
              const past = iso < todayIso;
              const selected = iso === value;
              const isToday = iso === todayIso;
              return (
                <button
                  key={iso}
                  type='button'
                  disabled={past}
                  aria-pressed={selected}
                  aria-current={isToday ? 'date' : undefined}
                  onClick={() => selectDay(iso)}
                  className={`grid h-8 place-items-center rounded-lg text-xs font-semibold transition-colors ${
                    selected
                      ? 'bg-sky-500 text-white'
                      : past
                        ? 'cursor-not-allowed text-slate-600'
                        : 'text-slate-200 hover:bg-slate-800'
                  } ${isToday && !selected ? 'ring-1 ring-sky-400/70' : ''}`}
                >
                  {dayNumber.format(Number(iso.slice(8)))}
                </button>
              );
            })}
          </div>

          {value ? (
            <button
              type='button'
              onClick={() => { onChange(''); closeAndFocus(); }}
              className='mt-2! w-full rounded-lg border border-slate-700 bg-slate-950 py-1.5 text-[11px] font-bold text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200'
            >
              {t.clear}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
