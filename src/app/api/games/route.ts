import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseGameBrowseInput, parseGameCreateInput, safeGameSelect } from '@/lib/game';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const input = parseGameBrowseInput(new URL(request.url).searchParams);
  const games = await prisma.game.findMany({ where: { isActive: true, ...(input.genre ? { genre: input.genre } : {}), ...(input.featured ? { isFeatured: true } : {}), ...(input.query ? { OR: [{ title: { contains: input.query, mode: 'insensitive' } }, { description: { contains: input.query, mode: 'insensitive' } }] } : {}) }, orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }], take: 36, select: safeGameSelect });
  return NextResponse.json({ games });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 });
  const input = parseGameCreateInput(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });
  const game = await prisma.game.create({ data: { ...input.data, createdById: user.id }, select: safeGameSelect });
  return NextResponse.json({ game }, { status: 201 });
}
