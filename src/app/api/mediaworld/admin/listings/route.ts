import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { adminListingWhere, adminRentalListingSelect, parseAdminListingQuery } from '@/lib/mediaworld/admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });
    }

    const parsed = parseAdminListingQuery(new URL(request.url).searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { limit, cursor } = parsed.data;
    const listings = await prisma.rentalListing.findMany({
      where: adminListingWhere(parsed.data),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: adminRentalListingSelect,
    });

    const hasMore = listings.length > limit;
    const page = hasMore ? listings.slice(0, limit) : listings;
    return NextResponse.json({ listings: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null });
  } catch (error) {
    console.error('[mediaworld/admin/listings GET] error:', error);
    return NextResponse.json({ error: 'Unable to load rental listings.' }, { status: 500 });
  }
}
