import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { describeConflict } from '@/lib/bookings/availability';
import { addDaysToDate, dhakaDate, resolveBookingWindow } from '@/lib/bookings/pricing';
import { findBlockedRanges, findConfirmedOverlaps, findListingConflict, findPendingOverlaps, toIsoRanges } from '@/lib/bookings/queries';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

const DEFAULT_WINDOW_DAYS = 90;

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const { id } = await params;
    if (!/^[a-z0-9]{1,40}$/i.test(id)) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    const searchParams = new URL(request.url).searchParams;
    const today = dhakaDate();
    const from = searchParams.get('from') || today;
    const to = searchParams.get('to') || addDaysToDate(from, DEFAULT_WINDOW_DAYS);

    const window = resolveBookingWindow('PER_DAY', { startDate: from, endDate: to });
    if (!window.ok) return NextResponse.json({ error: window.error }, { status: 400 });

    const listing = await prisma.rentalListing.findUnique({
      where: { id },
      select: {
        id: true,
        pricePaisa: true,
        priceUnit: true,
        priceCustom: true,
        availability: true,
        isActive: true,
        provider: { select: { userId: true } },
      },
    });
    if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    const range = { listingId: listing.id, from: window.window.startAt, to: window.window.endAt };
    const [bookings, blocks, pending] = await Promise.all([
      findConfirmedOverlaps(prisma, range),
      findBlockedRanges(prisma, range),
      findPendingOverlaps(prisma, range),
    ]);

    return NextResponse.json({
      listing: {
        id: listing.id,
        pricePaisa: listing.pricePaisa,
        priceUnit: listing.priceUnit,
        priceCustom: listing.priceCustom,
        availability: listing.availability,
        isActive: listing.isActive,
        isOwner: listing.provider.userId === user.id,
      },
      window: { from, to },
      blocked: [
        ...toIsoRanges(bookings).map((entry) => ({ ...entry, kind: 'booking' as const })),
        ...toIsoRanges(blocks).map((entry) => ({ ...entry, kind: 'block' as const })),
      ].sort((a, b) => a.startAt.localeCompare(b.startAt)),
      pending: toIsoRanges(pending),
    });
  } catch (error) {
    console.error('[for-rent/availability GET] error:', error);
    return NextResponse.json({ error: 'Unable to load availability.' }, { status: 500 });
  }
}

/** Used by the booking form after a selection changes, so the UI can explain why a slot is closed. */
export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const { id } = await params;
    if (!/^[a-z0-9]{1,40}$/i.test(id)) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });

    const listing = await prisma.rentalListing.findUnique({
      where: { id },
      select: { id: true, priceUnit: true, availability: true, isActive: true },
    });
    if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    const window = resolveBookingWindow(listing.priceUnit, body as { startDate: string; endDate: string; startTime?: string; endTime?: string });
    if (!window.ok) return NextResponse.json({ error: window.error }, { status: 400 });

    if (!listing.isActive || listing.availability !== 'AVAILABLE') {
      return NextResponse.json({ available: false, reason: 'This listing is not accepting bookings right now.' });
    }

    const conflict = await findListingConflict(prisma, {
      listingId: listing.id,
      startAt: window.window.startAt,
      endAt: window.window.endAt,
    });
    if (conflict) {
      return NextResponse.json({
        available: false,
        reason: describeConflict({
          kind: conflict.kind,
          startAt: conflict.startAt.toISOString(),
          endAt: conflict.endAt.toISOString(),
        }),
      });
    }

    const pending = await findPendingOverlaps(prisma, {
      listingId: listing.id,
      from: window.window.startAt,
      to: window.window.endAt,
    });

    return NextResponse.json({ available: true, competingRequests: pending.length });
  } catch (error) {
    console.error('[for-rent/availability POST] error:', error);
    return NextResponse.json({ error: 'Unable to check availability.' }, { status: 500 });
  }
}
