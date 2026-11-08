import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { describeConflict } from '@/lib/bookings/availability';
import { bookingListSelect, parseBookingRequest, serializeBooking } from '@/lib/bookings/booking';
import { quoteBooking, resolveBookingWindow } from '@/lib/bookings/pricing';
import { findListingConflict, findPendingOverlaps } from '@/lib/bookings/queries';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const { id } = await params;
    if (!/^[a-z0-9]{1,40}$/i.test(id)) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });

    const parsed = parseBookingRequest(body as Record<string, unknown>);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const listing = await prisma.rentalListing.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        pricePaisa: true,
        priceUnit: true,
        priceCustom: true,
        availability: true,
        isActive: true,
        provider: { select: { id: true, userId: true, ownerName: true, businessName: true } },
      },
    });
    if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    if (listing.provider.userId === user.id) {
      return NextResponse.json({ error: 'You cannot book your own listing.' }, { status: 400 });
    }
    if (!listing.isActive || listing.availability !== 'AVAILABLE') {
      return NextResponse.json({ error: 'This listing is not accepting bookings right now.' }, { status: 409 });
    }

    const window = resolveBookingWindow(listing.priceUnit, parsed.data);
    if (!window.ok) return NextResponse.json({ error: window.error }, { status: 400 });

    const quote = quoteBooking(listing, window.window.startAt, window.window.endAt);
    if (!quote.ok) return NextResponse.json({ error: quote.error }, { status: 400 });

    const duplicate = await prisma.booking.findFirst({
      where: {
        listingId: listing.id,
        renterId: user.id,
        status: 'PENDING',
        startAt: window.window.startAt,
        endAt: window.window.endAt,
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ error: 'You have already requested these exact dates.' }, { status: 409 });
    }

    const conflict = await findListingConflict(prisma, {
      listingId: listing.id,
      startAt: window.window.startAt,
      endAt: window.window.endAt,
    });
    if (conflict) {
      return NextResponse.json(
        {
          error: describeConflict({
            kind: conflict.kind,
            startAt: conflict.startAt.toISOString(),
            endAt: conflict.endAt.toISOString(),
          }),
          conflict: {
            kind: conflict.kind,
            startAt: conflict.startAt.toISOString(),
            endAt: conflict.endAt.toISOString(),
          },
        },
        { status: 409 },
      );
    }

    const competing = await findPendingOverlaps(prisma, {
      listingId: listing.id,
      from: window.window.startAt,
      to: window.window.endAt,
    });

    const created = await prisma.booking.create({
      data: {
        listingId: listing.id,
        renterId: user.id,
        startAt: window.window.startAt,
        endAt: window.window.endAt,
        priceUnit: listing.priceUnit,
        unitPricePaisa: listing.pricePaisa,
        priceCustom: listing.priceCustom,
        totalPaisa: quote.totalPaisa,
        note: parsed.data.note ?? null,
        history: {
          create: { fromStatus: null, toStatus: 'PENDING', actorId: user.id, note: 'Booking requested' },
        },
      },
      select: bookingListSelect,
    });

    return NextResponse.json(
      {
        booking: serializeBooking(created),
        quote: {
          totalPaisa: quote.totalPaisa,
          units: quote.units,
          unit: quote.unit,
          unitPricePaisa: quote.unitPricePaisa,
          negotiable: quote.negotiable,
        },
        competingRequests: competing.length,
        notice: 'Request sent. It stays pending until the provider approves it, so it is not confirmed yet.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[for-rent/bookings POST] error:', error);
    return NextResponse.json({ error: 'Unable to send the booking request.' }, { status: 500 });
  }
}
