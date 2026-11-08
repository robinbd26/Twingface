import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CreateRentalInquirySchema } from '@/lib/mediaworld/rental';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

const inquirySelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  message: true,
  status: true,
  createdAt: true,
  listing: { select: { id: true, title: true } },
} as const;

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const { id } = await params;
    if (!/^[a-z0-9]{1,40}$/i.test(id)) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    const listing = await prisma.rentalListing.findUnique({
      where: { id },
      select: { id: true, isActive: true, provider: { select: { userId: true } } },
    });
    if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    if (!listing.isActive) return NextResponse.json({ error: 'This listing is no longer accepting inquiries.' }, { status: 409 });
    if (listing.provider.userId === user.id) {
      return NextResponse.json({ error: 'You cannot send an inquiry about your own listing.' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = CreateRentalInquirySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        listingId: listing.id,
        userId: user.id,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        message: parsed.data.message,
      },
      select: inquirySelect,
    });
    return NextResponse.json({ inquiry }, { status: 201 });
  } catch (error) {
    console.error('[for-rent/[id]/inquiry POST] error:', error);
    return NextResponse.json({ error: 'Unable to send inquiry.' }, { status: 500 });
  }
}
