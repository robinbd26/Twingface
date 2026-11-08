import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { BOOKING_ACTIONS } from './lifecycle';

const shortText = (label: string, max: number) =>
  z.string().trim().min(1, `Choose a ${label}.`).max(max, `${label} is too long.`);

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer.`).optional();

export const BookingRequestSchema = z.object({
  startDate: shortText('start date', 10),
  endDate: shortText('return date', 10),
  startTime: optionalText(5, 'Start time'),
  endTime: optionalText(5, 'End time'),
  note: optionalText(1000, 'Note'),
});
export type BookingRequestInput = z.infer<typeof BookingRequestSchema>;

export const BookingActionSchema = z.object({
  action: z.enum(BOOKING_ACTIONS),
  note: optionalText(1000, 'Note'),
});
export type BookingActionInput = z.infer<typeof BookingActionSchema>;

export const AvailabilityBlockSchema = z.object({
  startDate: shortText('start date', 10),
  endDate: shortText('end date', 10),
  startTime: optionalText(5, 'Start time'),
  endTime: optionalText(5, 'End time'),
  reason: optionalText(200, 'Reason'),
});
export type AvailabilityBlockInput = z.infer<typeof AvailabilityBlockSchema>;

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

/** Browser forms send empty strings for optional inputs; treat them as absent. */
export function normalizeBookingFields(source: Record<string, unknown>) {
  return {
    startDate: text(source.startDate),
    endDate: text(source.endDate),
    startTime: text(source.startTime) || undefined,
    endTime: text(source.endTime) || undefined,
    note: text(source.note) || undefined,
    reason: text(source.reason) || undefined,
  };
}

export function parseBookingRequest(source: Record<string, unknown>) {
  return BookingRequestSchema.safeParse(normalizeBookingFields(source));
}

export function parseAvailabilityBlock(source: Record<string, unknown>) {
  return AvailabilityBlockSchema.safeParse(normalizeBookingFields(source));
}

const bookingListingSelect = {
  id: true,
  title: true,
  location: true,
  pricePaisa: true,
  priceUnit: true,
  priceCustom: true,
  availability: true,
  isActive: true,
  photos: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
  provider: {
    select: { id: true, ownerName: true, businessName: true, logoUrl: true },
  },
} as const;

export const bookingListSelect = {
  id: true,
  status: true,
  startAt: true,
  endAt: true,
  priceUnit: true,
  unitPricePaisa: true,
  priceCustom: true,
  totalPaisa: true,
  note: true,
  decisionNote: true,
  decidedAt: true,
  completedAt: true,
  createdAt: true,
  listing: { select: bookingListingSelect },
  renter: { select: { id: true, name: true, username: true, profileImage: true } },
  history: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      createdAt: true,
      actor: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.BookingSelect;

export type BookingListRow = Prisma.BookingGetPayload<{ select: typeof bookingListSelect }>;

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function serializeBooking(row: BookingListRow) {
  return {
    id: row.id,
    status: row.status,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    priceUnit: row.priceUnit,
    unitPricePaisa: row.unitPricePaisa,
    priceCustom: row.priceCustom,
    totalPaisa: row.totalPaisa,
    note: row.note,
    decisionNote: row.decisionNote,
    decidedAt: iso(row.decidedAt),
    completedAt: iso(row.completedAt),
    createdAt: row.createdAt.toISOString(),
    listing: {
      ...row.listing,
      photos: row.listing.photos.map((photo) => photo.url),
    },
    renter: row.renter,
    history: row.history.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export type BookingView = ReturnType<typeof serializeBooking>;

export const availabilityBlockSelect = {
  id: true,
  startAt: true,
  endAt: true,
  reason: true,
  createdAt: true,
} as const;

export type AvailabilityBlockRow = Prisma.RentalAvailabilityBlockGetPayload<{ select: typeof availabilityBlockSelect }>;

export function serializeBlock(row: AvailabilityBlockRow) {
  return {
    id: row.id,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  };
}

export type AvailabilityBlockView = ReturnType<typeof serializeBlock>;
