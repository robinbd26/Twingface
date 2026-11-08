import { describe, expect, it } from 'vitest';
import {
  DAY_MS,
  MAX_PAISA,
  formatBdt,
  formatBookingRange,
  quoteBooking,
  quoteSummary,
  resolveBlockWindow,
  resolveBookingWindow,
} from './pricing';

const DAY_START = new Date('2026-11-01T00:00:00+06:00');

describe('booking window resolution', () => {
  it('turns Dhaka calendar dates into exact UTC instants for day-based units', () => {
    const result = resolveBookingWindow('PER_DAY', { startDate: '2026-11-01', endDate: '2026-11-04' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.window.startAt.toISOString()).toBe('2026-10-31T18:00:00.000Z');
    expect(result.window.endAt.toISOString()).toBe('2026-11-03T18:00:00.000Z');
    expect(result.window.endAt.getTime() - result.window.startAt.getTime()).toBe(3 * DAY_MS);
  });

  it('ignores supplied times for non-hourly listings', () => {
    const result = resolveBookingWindow('PER_DAY', {
      startDate: '2026-11-01',
      endDate: '2026-11-02',
      startTime: '09:00',
      endTime: '13:00',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.window.endAt.getTime() - result.window.startAt.getTime()).toBe(DAY_MS);
  });

  it('requires a strictly positive, at-most-365-day window', () => {
    expect(resolveBookingWindow('PER_DAY', { startDate: '2026-11-01', endDate: '2026-11-01' })).toEqual({
      ok: false,
      error: 'The return date must be after the start date.',
    });
    expect(resolveBookingWindow('PER_DAY', { startDate: '2026-11-04', endDate: '2026-11-01' }).ok).toBe(false);
    expect(resolveBookingWindow('PER_DAY', { startDate: '2026-01-01', endDate: '2027-06-01' }).ok).toBe(false);
  });

  it('rejects impossible calendar dates instead of letting Date roll them over', () => {
    expect(resolveBookingWindow('PER_DAY', { startDate: '2026-02-31', endDate: '2026-03-05' })).toEqual({
      ok: false,
      error: 'Choose a valid date range.',
    });
  });

  it('needs wall-clock times for hourly listings and accepts same-day ranges', () => {
    expect(resolveBookingWindow('PER_HOUR', { startDate: '2026-11-01', endDate: '2026-11-01' }).ok).toBe(false);
    expect(resolveBookingWindow('PER_HOUR', {
      startDate: '2026-11-01',
      endDate: '2026-11-01',
      startTime: '10:00',
      endTime: '14:00',
    })).toMatchObject({ ok: true });
    expect(resolveBookingWindow('PER_HOUR', {
      startDate: '2026-11-01',
      endDate: '2026-11-01',
      startTime: '14:00',
      endTime: '10:00',
    })).toEqual({ ok: false, error: 'The end time must be after the start time.' });
    expect(resolveBookingWindow('PER_HOUR', {
      startDate: '2026-11-01',
      endDate: '2026-11-01',
      startTime: '9:00',
      endTime: '14:00',
    }).ok).toBe(false);
  });

  it('treats a block as hourly only when times are supplied', () => {
    const dayBlock = resolveBlockWindow({ startDate: '2026-11-01', endDate: '2026-11-03' });
    expect(dayBlock.ok).toBe(true);
    if (dayBlock.ok) expect(dayBlock.window.endAt.getTime() - dayBlock.window.startAt.getTime()).toBe(2 * DAY_MS);

    const hourBlock = resolveBlockWindow({ startDate: '2026-11-01', endDate: '2026-11-01', startTime: '09:00', endTime: '12:00' });
    expect(hourBlock.ok).toBe(true);
    if (hourBlock.ok) expect(hourBlock.window.endAt.getTime() - hourBlock.window.startAt.getTime()).toBe(3 * 60 * 60 * 1000);
  });
});

describe('booking price calculator', () => {
  const at = (iso: string) => new Date(iso);

  it('bills every started hour', () => {
    expect(quoteBooking({ priceUnit: 'PER_HOUR', pricePaisa: 50_000 }, at('2026-11-01T04:00:00Z'), at('2026-11-01T08:00:00Z')))
      .toEqual({ ok: true, totalPaisa: 200_000, units: 4, unit: 'PER_HOUR', unitPricePaisa: 50_000, negotiable: false });
    expect(quoteBooking({ priceUnit: 'PER_HOUR', pricePaisa: 50_000 }, at('2026-11-01T04:00:00Z'), at('2026-11-01T05:30:00Z')))
      .toMatchObject({ ok: true, units: 2, totalPaisa: 100_000 });
  });

  it('bills every started day, week and 30-day month', () => {
    const threeDays = quoteBooking({ priceUnit: 'PER_DAY', pricePaisa: 500_000 }, DAY_START, new Date(DAY_START.getTime() + 3 * DAY_MS));
    expect(threeDays).toMatchObject({ ok: true, units: 3, totalPaisa: 1_500_000 });

    const eightDays = quoteBooking({ priceUnit: 'PER_WEEK', pricePaisa: 2_500_000 }, DAY_START, new Date(DAY_START.getTime() + 8 * DAY_MS));
    expect(eightDays).toMatchObject({ ok: true, units: 2, totalPaisa: 5_000_000 });

    const thirtyOneDays = quoteBooking({ priceUnit: 'PER_MONTH', pricePaisa: 10_000_000 }, DAY_START, new Date(DAY_START.getTime() + 31 * DAY_MS));
    expect(thirtyOneDays).toMatchObject({ ok: true, units: 2, totalPaisa: 20_000_000 });
  });

  it('keeps a custom rate flat and treats a zero custom rate as negotiable', () => {
    expect(quoteBooking({ priceUnit: 'CUSTOM', pricePaisa: 0 }, DAY_START, new Date(DAY_START.getTime() + 5 * DAY_MS)))
      .toEqual({ ok: true, totalPaisa: null, units: null, unit: 'CUSTOM', unitPricePaisa: 0, negotiable: true });
    expect(quoteBooking({ priceUnit: 'CUSTOM', pricePaisa: 750_000 }, DAY_START, new Date(DAY_START.getTime() + 5 * DAY_MS)))
      .toMatchObject({ ok: true, totalPaisa: 750_000, negotiable: false });
  });

  it('refuses reversed windows, bad prices and integer overflow', () => {
    expect(quoteBooking({ priceUnit: 'PER_DAY', pricePaisa: 100 }, DAY_START, DAY_START).ok).toBe(false);
    expect(quoteBooking({ priceUnit: 'PER_DAY', pricePaisa: -1 }, DAY_START, new Date(DAY_START.getTime() + DAY_MS)).ok).toBe(false);
    expect(quoteBooking({ priceUnit: 'PER_DAY', pricePaisa: MAX_PAISA }, DAY_START, new Date(DAY_START.getTime() + 2 * DAY_MS)))
      .toEqual({ ok: false, error: 'This booking total is too large to quote.' });
  });

  it('formats BDT with the taka sign and a clear negotiable fallback', () => {
    expect(formatBdt(1_500_000)).toBe('৳15,000');
    expect(formatBdt(50_050)).toBe('৳500.50');
    expect(formatBdt(null)).toBe('Negotiable');
    expect(formatBdt(null, true)).toBe('আলোচনা সাপেক্ষে');
    expect(formatBookingRange('2026-10-31T18:00:00.000Z', '2026-11-03T18:00:00.000Z')).toContain('→');
    expect(formatBookingRange('2026-10-31T18:00:00.000Z', '2026-11-03T18:00:00.000Z')).not.toContain('18:00');
    expect(formatBookingRange('2026-10-31T18:00:00.000Z', '2026-11-03T18:00:00.000Z', true)).toContain('12:00 AM');
  });

  it('summarises the arithmetic for the estimate line', () => {
    const quote = quoteBooking({ priceUnit: 'PER_DAY', pricePaisa: 500_000 }, DAY_START, new Date(DAY_START.getTime() + 3 * DAY_MS));
    expect(quote.ok).toBe(true);
    if (quote.ok) expect(quoteSummary(quote)).toBe('3 days × ৳5,000 = ৳15,000');
    const custom = quoteBooking({ priceUnit: 'CUSTOM', pricePaisa: 0 }, DAY_START, new Date(DAY_START.getTime() + DAY_MS));
    if (custom.ok) expect(quoteSummary(custom)).toBe('The provider will confirm the rate.');
  });
});
