import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseGameUpdateInput, safeGameSelect } from '@/lib/game';

async function admin() {
  const user = await getCurrentUser();
  if (!user) return { response: NextResponse.json({ error: 'Authentication is required.' }, { status: 401 }) };
  if (user.role !== 'SUPER_ADMIN') return { response: NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 }) };
  return { user };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await admin(); if ('response' in access) return access.response;
  const input = parseGameUpdateInput(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });
  const { id } = await params;
  const game = await prisma.game.update({ where: { id }, data: input.data, select: safeGameSelect }).catch(() => null);
  return game ? NextResponse.json({ game }) : NextResponse.json({ error: 'Game not found.' }, { status: 404 });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await admin(); if ('response' in access) return access.response;
  const { id } = await params;
  const game = await prisma.game.delete({ where: { id }, select: { id: true } }).catch(() => null);
  return game ? NextResponse.json({ deleted: true }) : NextResponse.json({ error: 'Game not found.' }, { status: 404 });
}
