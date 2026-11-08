import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeGameSelect } from '@/lib/game';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.game.findFirst({ where: { id, isActive: true }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
  const game = await prisma.game.update({ where: { id }, data: { playCount: { increment: 1 } }, select: safeGameSelect });
  return NextResponse.json({ game });
}
