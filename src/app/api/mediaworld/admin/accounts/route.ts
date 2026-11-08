import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { adminAccountSelect, adminAccountWhere, parseAdminAccountQuery } from '@/lib/mediaworld/admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });
    }

    const parsed = parseAdminAccountQuery(new URL(request.url).searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { limit, cursor } = parsed.data;
    const [accounts, byType] = await Promise.all([
      prisma.user.findMany({
        where: adminAccountWhere(parsed.data),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: adminAccountSelect,
      }),
      prisma.user.groupBy({ by: ['accountType'], where: { accountType: { not: null } }, _count: { _all: true } }),
    ]);

    const hasMore = accounts.length > limit;
    const page = hasMore ? accounts.slice(0, limit) : accounts;

    return NextResponse.json({
      accounts: page,
      nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
      typeTotals: Object.fromEntries(byType.map((row) => [row.accountType ?? 'NONE', row._count._all])),
    });
  } catch (error) {
    console.error('[mediaworld/admin/accounts GET] error:', error);
    return NextResponse.json({ error: 'Unable to load Media World accounts.' }, { status: 500 });
  }
}
