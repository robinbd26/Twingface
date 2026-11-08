import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { BOOKING_STATUSES } from '@/lib/bookings/lifecycle';
import { bookingListSelect, serializeBooking } from '@/lib/bookings/booking';

export const runtime = 'nodejs';

const MAX_ROWS = 100;

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const searchParams = new URL(request.url).searchParams;
    const box = searchParams.get('box') === 'provider' ? 'provider' : 'renter';
    const requestedStatus = (searchParams.get('status') ?? '').toUpperCase();
    const status = (BOOKING_STATUSES as readonly string[]).includes(requestedStatus)
      ? (requestedStatus as (typeof BOOKING_STATUSES)[number])
      : undefined;

    const where: Prisma.BookingWhereInput =
      box === 'provider'
        ? { listing: { provider: { userId: user.id } }, ...(status ? { status } : {}) }
        : { renterId: user.id, ...(status ? { status } : {}) };

    const rows = await prisma.booking.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: MAX_ROWS,
      select: bookingListSelect,
    });

    return NextResponse.json({ box, bookings: rows.map(serializeBooking) });
  } catch (error) {
    console.error('[bookings GET] error:', error);
    return NextResponse.json({ error: 'Unable to load bookings.' }, { status: 500 });
  }
}
