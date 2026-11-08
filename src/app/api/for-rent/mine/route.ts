import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rentalListingCardSelect } from '@/lib/mediaworld/rental';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const provider = await prisma.rentalProvider.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!provider) return NextResponse.json({ provider: null, listings: [] });

    const listings = await prisma.rentalListing.findMany({
      where: { providerId: provider.id },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: {
        ...rentalListingCardSelect,
        provider: { select: { id: true } },
        _count: { select: { inquiries: true, reports: true } },
      },
    });
    return NextResponse.json({ provider: { id: provider.id }, listings });
  } catch (error) {
    console.error('[for-rent/mine GET] error:', error);
    return NextResponse.json({ error: 'Unable to load your rental listings.' }, { status: 500 });
  }
}
