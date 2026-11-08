import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseAdLimit, safeAdSelect } from '@/lib/ads';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = parseAdLimit(searchParams.get('limit'));
  const ads = await prisma.ad.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: safeAdSelect,
  });
  return NextResponse.json({ ads });
}
