import type { Prisma } from '@prisma/client';

export type ListingConflict = {
  kind: 'booking' | 'block';
  startAt: Date;
  endAt: Date;
};

type ConflictParams = {
  listingId: string;
  startAt: Date;
  endAt: Date;
  excludeBookingId?: string;
};

/**
 * Only CONFIRMED bookings and provider blocks take a slot. Pending requests stay
 * advisory so a stalled request cannot freeze a listing.
 */
export async function findListingConflict(
  client: Prisma.TransactionClient,
  { listingId, startAt, endAt, excludeBookingId }: ConflictParams,
): Promise<ListingConflict | null> {
  const [booking, block] = await Promise.all([
    client.booking.findFirst({
      where: {
        listingId,
        status: 'CONFIRMED',
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      orderBy: { startAt: 'asc' },
      select: { startAt: true, endAt: true },
    }),
    client.rentalAvailabilityBlock.findFirst({
      where: { listingId, startAt: { lt: endAt }, endAt: { gt: startAt } },
      orderBy: { startAt: 'asc' },
      select: { startAt: true, endAt: true },
    }),
  ]);

  if (booking && block) {
    return booking.startAt <= block.startAt
      ? { kind: 'booking', startAt: booking.startAt, endAt: booking.endAt }
      : { kind: 'block', startAt: block.startAt, endAt: block.endAt };
  }
  if (booking) return { kind: 'booking', startAt: booking.startAt, endAt: booking.endAt };
  if (block) return { kind: 'block', startAt: block.startAt, endAt: block.endAt };
  return null;
}

export async function findConfirmedOverlaps(
  client: Prisma.TransactionClient,
  { listingId, from, to }: { listingId: string; from: Date; to: Date },
) {
  return client.booking.findMany({
    where: { listingId, status: 'CONFIRMED', startAt: { lt: to }, endAt: { gt: from } },
    orderBy: { startAt: 'asc' },
    select: { startAt: true, endAt: true },
  });
}

export async function findPendingOverlaps(
  client: Prisma.TransactionClient,
  { listingId, from, to }: { listingId: string; from: Date; to: Date },
) {
  return client.booking.findMany({
    where: { listingId, status: 'PENDING', startAt: { lt: to }, endAt: { gt: from } },
    orderBy: { startAt: 'asc' },
    select: { startAt: true, endAt: true },
  });
}

export async function findBlockedRanges(
  client: Prisma.TransactionClient,
  { listingId, from, to }: { listingId: string; from: Date; to: Date },
) {
  return client.rentalAvailabilityBlock.findMany({
    where: { listingId, startAt: { lt: to }, endAt: { gt: from } },
    orderBy: { startAt: 'asc' },
    select: { startAt: true, endAt: true },
  });
}

export function toIsoRanges<T extends { startAt: Date; endAt: Date }>(ranges: T[]) {
  return ranges.map((range) => ({ startAt: range.startAt.toISOString(), endAt: range.endAt.toISOString() }));
}
