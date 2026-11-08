import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseFriendLimit, safeFriendshipSelect } from '@/lib/friendship';

type Context = { params: Promise<{ username: string }> };

export async function GET(request: Request, { params }: Context) {
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const limit = parseFriendLimit(searchParams.get('limit'));
  const cursor = searchParams.get('cursor') || undefined;
  const rows = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: user.id }, { recipientId: user.id }] },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: safeFriendshipSelect,
  });
  const hasMore = rows.length > limit;
  const friendships = hasMore ? rows.slice(0, limit) : rows;
  const friends = friendships.map((friendship) => (
    friendship.requesterId === user.id ? friendship.recipient : friendship.requester
  ));
  return NextResponse.json({ friends, nextCursor: hasMore ? friendships.at(-1)?.id ?? null : null });
}
