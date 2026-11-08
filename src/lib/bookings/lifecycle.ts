export const BOOKING_ACTIONS = ['approve', 'reject', 'cancel', 'complete'] as const;
export type BookingAction = (typeof BOOKING_ACTIONS)[number];

export const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const;
export type BookingStatusValue = (typeof BOOKING_STATUSES)[number];

export type BookingActorRole = 'renter' | 'provider';

type ActionRule = {
  from: readonly BookingStatusValue[];
  to: BookingStatusValue;
  roles: readonly BookingActorRole[];
};

/**
 * CONFIRMED is reachable from exactly one place: the provider approving a PENDING
 * request. Nothing else in the app may set it.
 */
export const BOOKING_ACTION_RULES: Record<BookingAction, ActionRule> = {
  approve: { from: ['PENDING'], to: 'CONFIRMED', roles: ['provider'] },
  reject: { from: ['PENDING'], to: 'REJECTED', roles: ['provider'] },
  cancel: { from: ['PENDING', 'CONFIRMED'], to: 'CANCELLED', roles: ['renter', 'provider'] },
  complete: { from: ['CONFIRMED'], to: 'COMPLETED', roles: ['provider'] },
};

export type ActionCheck =
  | { ok: true; to: BookingStatusValue }
  | { ok: false; reason: 'forbidden' | 'not-allowed' };

export function checkBookingAction(
  action: BookingAction,
  status: BookingStatusValue,
  role: BookingActorRole,
): ActionCheck {
  const rule = BOOKING_ACTION_RULES[action];
  if (!rule.roles.includes(role)) return { ok: false, reason: 'forbidden' };
  if (!rule.from.includes(status)) return { ok: false, reason: 'not-allowed' };
  return { ok: true, to: rule.to };
}

export const BOOKING_STATUS_LABELS: Record<BookingStatusValue, { en: string; bn: string }> = {
  PENDING: { en: 'Pending provider approval', bn: 'প্রোভাইডারের অনুমোদনের অপেক্ষায়' },
  CONFIRMED: { en: 'Confirmed', bn: 'নিশ্চিত হয়েছে' },
  REJECTED: { en: 'Rejected', bn: 'প্রত্যাখ্যাত' },
  CANCELLED: { en: 'Cancelled', bn: 'বাতিল' },
  COMPLETED: { en: 'Completed', bn: 'সম্পন্ন' },
};

export function bookingStatusLabel(status: BookingStatusValue, bn = false): string {
  return BOOKING_STATUS_LABELS[status][bn ? 'bn' : 'en'];
}

export function isOpenStatus(status: BookingStatusValue): boolean {
  return status === 'PENDING' || status === 'CONFIRMED';
}

/** The renter-facing history note must never read as confirmed before approval. */
export function statusNotice(status: BookingStatusValue, bn = false): string {
  if (status === 'PENDING') {
    return bn
      ? 'এটি এখনো নিশ্চিত হয়নি — প্রোভাইডার অনুমোদন করলে তবেই বুকিং নিশ্চিত হবে।'
      : 'This is not confirmed yet. The provider still has to approve the request.';
  }
  if (status === 'CONFIRMED') {
    return bn
      ? 'প্রোভাইডার প্রাপ্যতা যাচাই করে বুকিং নিশ্চিত করেছেন।'
      : 'The provider verified availability and confirmed this booking.';
  }
  if (status === 'COMPLETED') {
    return bn ? 'বুকিংটি সম্পন্ন হয়েছে।' : 'This booking is complete.';
  }
  return bn ? 'এই বুকিংটি বন্ধ হয়েছে।' : 'This booking is closed.';
}
