import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeMarketplaceListingSelect } from '@/lib/marketplace';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const listings = await prisma.marketplaceListing.findMany({
    where: { sellerId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: safeMarketplaceListingSelect,
  });
  return NextResponse.json({ listings });
}
