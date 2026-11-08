import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { adminReportSelect, parseAdminReportQuery } from '@/lib/mediaworld/admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });
    }

    const parsed = parseAdminReportQuery(new URL(request.url).searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { view, listingId, limit, cursor } = parsed.data;
    const reports = await prisma.rentalListingReport.findMany({
      where: {
        ...(view === 'QUEUE' ? { status: { in: ['OPEN', 'IN_REVIEW'] } } : {}),
        ...(listingId ? { listingId } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: adminReportSelect,
    });

    const hasMore = reports.length > limit;
    const page = hasMore ? reports.slice(0, limit) : reports;
    const openCount = await prisma.rentalListingReport.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } } });

    return NextResponse.json({ reports: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null, openCount });
  } catch (error) {
    console.error('[mediaworld/admin/reports GET] error:', error);
    return NextResponse.json({ error: 'Unable to load listing reports.' }, { status: 500 });
  }
}
