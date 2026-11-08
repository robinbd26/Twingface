import type { RentalPriceUnit } from '@/lib/mediaworld/rental';

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const WEEK_MS = 7 * DAY_MS;
export const MONTH_MS = 30 * DAY_MS;
export const MAX_BOOKING_MS = 365 * DAY_MS;
export const MAX_PAISA = 2_147_483_647;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Bangladesh has no daylight saving, so a fixed offset is exact and needs no tz database. */
export const DHAKA_OFFSET = '+06:00';

const UNIT_DURATION: Record<Exclude<RentalPriceUnit, 'CUSTOM'>, number> = {
  PER_HOUR: HOUR_MS,
  PER_DAY: DAY_MS,
  PER_WEEK: WEEK_MS,
  PER_MONTH: MONTH_MS,
};

export type BookingWindowInput = {
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
};

export type BookingWindow = { startAt: Date; endAt: Date };

export type WindowResult = { ok: true; window: BookingWindow } | { ok: false; error: string };

export type BookingQuote =
  | {
      ok: true;
      totalPaisa: number | null;
      units: number | null;
      unit: RentalPriceUnit;
      unitPricePaisa: number;
      negotiable: boolean;
    }
  | { ok: false; error: string };

/** Rejects impossible calendar dates such as 2026-02-31 that `Date` would silently roll over. */
export function isDateInput(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export function isTimeInput(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function dhakaInstant(date: string, time: string): Date | null {
  if (!isDateInput(date) || !isTimeInput(time)) return null;
  const instant = new Date(`${date}T${time}:00${DHAKA_OFFSET}`);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

const DHAKA_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' });

/** The calendar day a Dhaka viewer is currently in, as `YYYY-MM-DD`. */
export function dhakaDate(instant: Date = new Date()): string {
  return DHAKA_DATE.format(instant);
}

export function addDaysToDate(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/**
 * Hourly listings need wall-clock times; every other unit is billed from midnight
 * to midnight so a "1st to 4th" booking is exactly three days.
 */
export function resolveBookingWindow(priceUnit: RentalPriceUnit, input: BookingWindowInput): WindowResult {
  const hourly = priceUnit === 'PER_HOUR';
  const startTime = hourly ? input.startTime ?? '' : '00:00';
  const endTime = hourly ? input.endTime ?? '' : '00:00';

  if (!isDateInput(input.startDate) || !isDateInput(input.endDate)) {
    return { ok: false, error: 'Choose a valid date range.' };
  }
  if (hourly && (!isTimeInput(startTime) || !isTimeInput(endTime))) {
    return { ok: false, error: 'Choose a valid start and end time.' };
  }

  const startAt = dhakaInstant(input.startDate, startTime);
  const endAt = dhakaInstant(input.endDate, endTime);
  if (!startAt || !endAt) return { ok: false, error: 'Choose a valid date range.' };
  if (endAt.getTime() <= startAt.getTime()) {
    return {
      ok: false,
      error: hourly ? 'The end time must be after the start time.' : 'The return date must be after the start date.',
    };
  }
  if (endAt.getTime() - startAt.getTime() > MAX_BOOKING_MS) {
    return { ok: false, error: 'A booking can run for at most 365 days.' };
  }
  return { ok: true, window: { startAt, endAt } };
}

/** Blocks use the same window rules, with times only when the provider supplied them. */
export function resolveBlockWindow(input: BookingWindowInput): WindowResult {
  const hasTimes = Boolean(input.startTime || input.endTime);
  return resolveBookingWindow(hasTimes ? 'PER_HOUR' : 'PER_DAY', input);
}

export function unitLabel(unit: RentalPriceUnit, bn = false): string {
  const labels: Record<RentalPriceUnit, { en: string; bn: string }> = {
    PER_HOUR: { en: 'hour', bn: 'ঘণ্টা' },
    PER_DAY: { en: 'day', bn: 'দিন' },
    PER_WEEK: { en: 'week', bn: 'সপ্তাহ' },
    PER_MONTH: { en: 'month', bn: 'মাস' },
    CUSTOM: { en: 'booking', bn: 'বুকিং' },
  };
  return labels[unit][bn ? 'bn' : 'en'];
}

/**
 * Rounds up to whole units: rentals are billed per started hour/day/week/month.
 * `CUSTOM` is a flat negotiated amount; a zero amount means "ask the provider".
 */
export function quoteBooking(
  pricing: { priceUnit: RentalPriceUnit; pricePaisa: number },
  startAt: Date,
  endAt: Date,
): BookingQuote {
  if (!Number.isInteger(pricing.pricePaisa) || pricing.pricePaisa < 0) {
    return { ok: false, error: 'This listing has an invalid price.' };
  }
  const duration = endAt.getTime() - startAt.getTime();
  if (!Number.isFinite(duration) || duration <= 0) {
    return { ok: false, error: 'Choose a valid date range.' };
  }

  if (pricing.priceUnit === 'CUSTOM') {
    return {
      ok: true,
      totalPaisa: pricing.pricePaisa > 0 ? pricing.pricePaisa : null,
      units: null,
      unit: 'CUSTOM',
      unitPricePaisa: pricing.pricePaisa,
      negotiable: pricing.pricePaisa === 0,
    };
  }

  const units = Math.ceil(duration / UNIT_DURATION[pricing.priceUnit]);
  const totalPaisa = units * pricing.pricePaisa;
  if (!Number.isSafeInteger(totalPaisa) || totalPaisa > MAX_PAISA) {
    return { ok: false, error: 'This booking total is too large to quote.' };
  }
  return {
    ok: true,
    totalPaisa,
    units,
    unit: pricing.priceUnit,
    unitPricePaisa: pricing.pricePaisa,
    negotiable: false,
  };
}

const WHOLE_TAKA_FORMAT = new Intl.NumberFormat('en-US');
const PAISA_FORMAT = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatBdt(paisa: number | null, bn = false): string {
  if (paisa === null) return bn ? 'আলোচনা সাপেক্ষে' : 'Negotiable';
  const amount = paisa % 100 === 0 ? WHOLE_TAKA_FORMAT.format(paisa / 100) : PAISA_FORMAT.format(paisa / 100);
  return `৳${amount}`;
}

const DATE_ONLY = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });
const DATE_TIME = new Intl.DateTimeFormat('en-BD', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Dhaka',
});

export function formatBookingRange(startAt: Date | string, endAt: Date | string, hourly = false): string {
  const start = startAt instanceof Date ? startAt : new Date(startAt);
  const end = endAt instanceof Date ? endAt : new Date(endAt);
  const formatter = hourly ? DATE_TIME : DATE_ONLY;
  return `${formatter.format(start)} → ${formatter.format(end)}`;
}

export function quoteSummary(quote: Extract<BookingQuote, { ok: true }>, bn = false): string {
  if (quote.negotiable) return bn ? 'রেট প্রোভাইডারের সঙ্গে ঠিক হবে।' : 'The provider will confirm the rate.';
  if (quote.unit === 'CUSTOM') {
    return `${formatBdt(quote.totalPaisa, bn)} ${bn ? 'ফ্ল্যাট রেট' : 'flat rate'}`;
  }
  const unit = unitLabel(quote.unit, bn);
  const count = bn ? `${quote.units} ${unit}` : `${quote.units} ${quote.units === 1 ? unit : `${unit}s`}`;
  return `${count} × ${formatBdt(quote.unitPricePaisa, bn)} = ${formatBdt(quote.totalPaisa, bn)}`;
}
