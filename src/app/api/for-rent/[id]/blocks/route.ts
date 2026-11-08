import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  availabilityBlockSelect,
  parseAvailabilityBlock,
  serializeBlock,
} from '@/lib/bookings/booking';
import { resolveBlockWindow } from '@/lib/bookings/pricing';
import { findBlockedRanges, findConfirmedOverlaps } from '@/lib/bookings/queries';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

async function loadOwnedListing(id: string) {
  if (!/^[a-z0-9]{1,40}$/i.test(id)) return null;
  return prisma.rentalListing.findUnique({
    where: { id },
    select: { id: true, title: true, provider: { select: { id: true, userId: true } } },
  });
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const { id } = await params;
    const listing = await loadOwnedListing(id);
    if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    if (listing.provider.userId !== user.id) {
      return NextResponse.json({ error: 'Only the listing owner can view its availability.' }, { status: 403 });
    }

    const blocks = await prisma.rentalAvailabilityBlock.findMany({
      where: { listingId: listing.id },
      orderBy: { startAt: 'asc' },
      select: availabilityBlockSelect,
    });
    return NextResponse.json({ blocks: blocks.map(serializeBlock) });
  } catch (error) {
    console.error('[for-rent/blocks GET] error:', error);
    return NextResponse.json({ error: 'Unable to load availability blocks.' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const { id } = await params;
    const listing = await loadOwnedListing(id);
    if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    if (listing.provider.userId !== user.id) {
      return NextResponse.json({ error: 'Only the listing owner can block dates.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });

    const parsed = parseAvailabilityBlock(body as Record<string, unknown>);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const window = resolveBlockWindow(parsed.data);
    if (!window.ok) return NextResponse.json({ error: window.error }, { status: 400 });

    const [confirmed, existing] = await Promise.all([
      findConfirmedOverlaps(prisma, { listingId: listing.id, from: window.window.startAt, to: window.window.endAt }),
      findBlockedRanges(prisma, { listingId: listing.id, from: window.window.startAt, to: window.window.endAt }),
    ]);
    if (confirmed.length) {
      return NextResponse.json(
        { error: 'A confirmed booking already covers these dates. Cancel that booking before blocking them.' },
        { status: 409 },
      );
    }
    if (existing.length) {
      return NextResponse.json({ error: 'Those dates are already blocked.' }, { status: 409 });
    }

    const block = await prisma.rentalAvailabilityBlock.create({
      data: {
        listingId: listing.id,
        providerId: listing.provider.id,
        startAt: window.window.startAt,
        endAt: window.window.endAt,
        reason: parsed.data.reason ?? null,
      },
      select: availabilityBlockSelect,
    });
    return NextResponse.json({ block: serializeBlock(block) }, { status: 201 });
  } catch (error) {
    console.error('[for-rent/blocks POST] error:', error);
    return NextResponse.json({ error: 'Unable to block those dates.' }, { status: 500 });
  }
}
