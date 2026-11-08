import { describe, expect, it } from 'vitest';
import {
  BOOKING_ACTION_RULES,
  bookingStatusLabel,
  checkBookingAction,
  isOpenStatus,
  statusNotice,
} from './lifecycle';

describe('booking lifecycle', () => {
  it('lets only the listing owner approve a pending request', () => {
    expect(checkBookingAction('approve', 'PENDING', 'provider')).toEqual({ ok: true, to: 'CONFIRMED' });
    expect(checkBookingAction('approve', 'PENDING', 'renter')).toEqual({ ok: false, reason: 'forbidden' });
    expect(checkBookingAction('approve', 'CONFIRMED', 'provider')).toEqual({ ok: false, reason: 'not-allowed' });
    expect(checkBookingAction('approve', 'CANCELLED', 'provider')).toEqual({ ok: false, reason: 'not-allowed' });
  });

  it('never reaches CONFIRMED from any action other than approve', () => {
    const targets = Object.entries(BOOKING_ACTION_RULES)
      .filter(([action]) => action !== 'approve')
      .map(([, rule]) => rule.to);
    expect(targets).not.toContain('CONFIRMED');
    expect(BOOKING_ACTION_RULES.approve.from).toEqual(['PENDING']);
    expect(BOOKING_ACTION_RULES.approve.to).toBe('CONFIRMED');
  });

  it('lets the renter or the provider cancel an open booking', () => {
    expect(checkBookingAction('cancel', 'PENDING', 'renter')).toEqual({ ok: true, to: 'CANCELLED' });
    expect(checkBookingAction('cancel', 'CONFIRMED', 'renter')).toEqual({ ok: true, to: 'CANCELLED' });
    expect(checkBookingAction('cancel', 'CONFIRMED', 'provider')).toEqual({ ok: true, to: 'CANCELLED' });
    expect(checkBookingAction('cancel', 'COMPLETED', 'renter')).toEqual({ ok: false, reason: 'not-allowed' });
    expect(checkBookingAction('cancel', 'REJECTED', 'provider')).toEqual({ ok: false, reason: 'not-allowed' });
  });

  it('completes only a confirmed booking and only from the provider side', () => {
    expect(checkBookingAction('complete', 'CONFIRMED', 'provider')).toEqual({ ok: true, to: 'COMPLETED' });
    expect(checkBookingAction('complete', 'CONFIRMED', 'renter')).toEqual({ ok: false, reason: 'forbidden' });
    expect(checkBookingAction('complete', 'PENDING', 'provider')).toEqual({ ok: false, reason: 'not-allowed' });
  });

  it('keeps rejection out of the renter’s hands', () => {
    expect(checkBookingAction('reject', 'PENDING', 'renter')).toEqual({ ok: false, reason: 'forbidden' });
    expect(checkBookingAction('reject', 'PENDING', 'provider')).toEqual({ ok: true, to: 'REJECTED' });
  });

  it('labels a pending request as unconfirmed and treats only pending/confirmed as open', () => {
    expect(bookingStatusLabel('PENDING')).toBe('Pending provider approval');
    expect(bookingStatusLabel('CONFIRMED', true)).toBe('নিশ্চিত হয়েছে');
    expect(statusNotice('PENDING')).toMatch(/not confirmed yet/i);
    expect(statusNotice('PENDING')).not.toMatch(/^confirmed/i);
    expect(statusNotice('CONFIRMED')).toMatch(/verified availability/i);
    expect(isOpenStatus('PENDING')).toBe(true);
    expect(isOpenStatus('CONFIRMED')).toBe(true);
    expect(isOpenStatus('REJECTED')).toBe(false);
    expect(isOpenStatus('CANCELLED')).toBe(false);
    expect(isOpenStatus('COMPLETED')).toBe(false);
  });
});
