import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ReportRentalListingSchema } from '@/lib/mediaworld/rental';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const { id } = await params;
    if (!/^[a-z0-9]{1,40}$/i.test(id)) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    const listing = await prisma.rentalListing.findUnique({
      where: { id },
      select: { id: true, provider: { select: { userId: true } } },
    });
    if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    if (listing.provider.userId === user.id) {
      return NextResponse.json({ error: 'You cannot report your own listing.' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = ReportRentalListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const alreadyOpen = await prisma.rentalListingReport.findFirst({
      where: { listingId: listing.id, reporterId: user.id, status: 'OPEN' },
      select: { id: true },
    });
    if (alreadyOpen) {
      return NextResponse.json({ error: 'You already reported this listing.', reportId: alreadyOpen.id }, { status: 409 });
    }

    const report = await prisma.rentalListingReport.create({
      data: {
        listingId: listing.id,
        reporterId: user.id,
        reason: parsed.data.reason,
        details: parsed.data.details || null,
      },
      select: { id: true, reason: true, status: true, createdAt: true },
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error('[for-rent/[id]/report POST] error:', error);
    return NextResponse.json({ error: 'Unable to report listing.' }, { status: 500 });
  }
}
