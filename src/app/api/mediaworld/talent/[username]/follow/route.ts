import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Context = { params: Promise<{ username: string }> };

async function resolveTarget(
  username: string,
  viewerId: string,
): Promise<{ targetId: string } | { error: NextResponse }> {
  const target = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, accountType: true },
  });
  if (!target || !target.accountType) {
    return { error: NextResponse.json({ error: 'Media World profile not found.' }, { status: 404 }) };
  }
  if (target.id === viewerId) {
    return { error: NextResponse.json({ error: 'You cannot follow your own profile.' }, { status: 400 }) };
  }
  return { targetId: target.id };
}

export async function POST(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const { username } = await params;
  const resolved = await resolveTarget(username, user.id);
  if ('error' in resolved) return resolved.error;

  await prisma.talentFollow.upsert({
    where: { followerId_followingId: { followerId: user.id, followingId: resolved.targetId } },
    create: { followerId: user.id, followingId: resolved.targetId },
    update: {},
  });
  return NextResponse.json({ following: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const { username } = await params;
  const resolved = await resolveTarget(username, user.id);
  if ('error' in resolved) return resolved.error;

  await prisma.talentFollow.deleteMany({
    where: { followerId: user.id, followingId: resolved.targetId },
  });
  return NextResponse.json({ following: false });
}
