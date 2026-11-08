import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeFriendUserSelect } from '@/lib/relationship';
import { isPresenceActive } from '@/lib/presence';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const friendships = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: user.id }, { recipientId: user.id }] },
    orderBy: { updatedAt: 'desc' },
    select: {
      requesterId: true,
      recipientId: true,
      requester: { select: safeFriendUserSelect },
      recipient: { select: safeFriendUserSelect },
    },
  });

  const friends = friendships.map((row) => (row.requesterId === user.id ? row.recipient : row.requester));
  const friendIds = friends.map((friend) => friend.id);

  const presenceRows = friendIds.length
    ? await prisma.userPresence.findMany({ where: { userId: { in: friendIds } }, select: { userId: true, isOnline: true, lastActiveAt: true } })
    : [];
  const presenceById = new Map(presenceRows.map((row) => [row.userId, row]));
  const now = new Date();

  const contacts = friends
    .map((friend) => {
      const presence = presenceById.get(friend.id) ?? null;
      return {
        ...friend,
        isOnline: isPresenceActive(presence, now),
        lastActiveAt: presence?.lastActiveAt ?? null,
      };
    })
    .sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || a.name.localeCompare(b.name));

  return NextResponse.json({ contacts, onlineCount: contacts.filter((contact) => contact.isOnline).length });
}
