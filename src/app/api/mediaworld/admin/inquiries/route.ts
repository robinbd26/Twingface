import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { adminInquirySelect, parseAdminInquiryQuery } from '@/lib/mediaworld/admin';

export const runtime = 'nodejs';

// Read-only on purpose: inquiry statuses belong to the provider who received them.
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });
    }

    const parsed = parseAdminInquiryQuery(new URL(request.url).searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { status, query, limit, cursor } = parsed.data;
    const inquiries = await prisma.inquiry.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(query ? { listing: { title: { contains: query, mode: 'insensitive' } } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: adminInquirySelect,
    });

    const hasMore = inquiries.length > limit;
    const page = hasMore ? inquiries.slice(0, limit) : inquiries;
    return NextResponse.json({ inquiries: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null });
  } catch (error) {
    console.error('[mediaworld/admin/inquiries GET] error:', error);
    return NextResponse.json({ error: 'Unable to load inquiries.' }, { status: 500 });
  }
}
