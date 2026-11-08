import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseConversationLimit, safeInboxConversationSelect } from '@/lib/message';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const friendships = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: user.id }, { recipientId: user.id }] },
    select: { pairKey: true },
  });
  const { searchParams } = new URL(request.url);
  const limit = parseConversationLimit(searchParams.get('limit'));
  const cursor = searchParams.get('cursor') || undefined;
  const rows = await prisma.directConversation.findMany({
    where: {
      AND: [
        { OR: [{ participantOneId: user.id }, { participantTwoId: user.id }] },
        { OR: [{ pairKey: { in: friendships.map((friendship) => friendship.pairKey) } }, { marketplaceMessagingEnabled: true }, { mediaWorldMessagingEnabled: true }] },
      ],
    },
    orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: safeInboxConversationSelect(user.id),
  });
  const hasMore = rows.length > limit;
  const conversations = hasMore ? rows.slice(0, limit) : rows;
  const unreadCount = await prisma.directMessage.count({
    where: {
      conversation: {
        AND: [
          { OR: [{ participantOneId: user.id }, { participantTwoId: user.id }] },
          { OR: [{ pairKey: { in: friendships.map((friendship) => friendship.pairKey) } }, { marketplaceMessagingEnabled: true }, { mediaWorldMessagingEnabled: true }] },
        ],
      },
      senderId: { not: user.id },
      isRead: false,
    },
  });
  return NextResponse.json({ conversations, unreadCount, nextCursor: hasMore ? conversations.at(-1)?.id ?? null : null });
}
