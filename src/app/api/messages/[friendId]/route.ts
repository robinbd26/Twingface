import { NextResponse } from 'next/server';
import type { DirectMessage } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canUseDirectConversation, parseMessageLimit, safeDirectMessageSelect } from '@/lib/message';
import { makePairKey, safeFriendUserSelect } from '@/lib/relationship';

type Context = { params: Promise<{ friendId: string }> };
type SafeDirectMessage = Pick<DirectMessage, 'id' | 'content' | 'attachments' | 'isRead' | 'createdAt' | 'senderId'> & {
  sender: { id: string; name: string; username: string; profileImage: string | null };
};

export async function GET(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { friendId } = await params;
  if (friendId === user.id) return NextResponse.json({ error: 'You cannot message yourself.' }, { status: 400 });

  const pairKey = makePairKey(user.id, friendId);
  if (!await canUseDirectConversation({ viewerId: user.id, otherUserId: friendId, pairKey }, prisma)) {
    return NextResponse.json({ error: 'Messaging is available after both users become friends.' }, { status: 403 });
  }

  const friend = await prisma.user.findUnique({ where: { id: friendId }, select: safeFriendUserSelect });
  if (!friend) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const limit = parseMessageLimit(searchParams.get('limit'));
  const cursor = searchParams.get('cursor') || undefined;
  const sinceParam = searchParams.get('since');

  const conversation = await prisma.directConversation.findUnique({ where: { pairKey }, select: { id: true } });

  if (conversation) {
    await prisma.directMessage.updateMany({
      where: { conversationId: conversation.id, senderId: { not: user.id }, isRead: false },
      data: { isRead: true },
    });
  }

  // Lightweight polling cursor: return only messages newer than `since`
  // (oldest first). This backs the chat window's DB fallback so live delivery
  // stays reliable when an SSE event is missed — a dropped connection, or a
  // deployment whose in-process fan-out can't reach this tab.
  if (sinceParam) {
    const since = new Date(sinceParam);
    if (Number.isNaN(since.getTime())) {
      return NextResponse.json({ error: 'Invalid cursor timestamp.' }, { status: 400 });
    }
    let fresh: SafeDirectMessage[] = [];
    if (conversation) {
      const rows = await prisma.directMessage.findMany({
        where: { conversationId: conversation.id, createdAt: { gt: since } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: limit,
        select: safeDirectMessageSelect,
      });
      fresh = rows as SafeDirectMessage[];
    }
    return NextResponse.json({ friend, conversationId: conversation?.id ?? null, messages: fresh, nextCursor: null });
  }

  let messages: SafeDirectMessage[] = [];
  let nextCursor: string | null = null;
  if (conversation) {
    const rows = await prisma.directMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: safeDirectMessageSelect,
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    messages = [...page].reverse() as SafeDirectMessage[];
    nextCursor = hasMore ? page.at(-1)?.id ?? null : null;
  }

  return NextResponse.json({
    friend,
    conversationId: conversation?.id ?? null,
    messages,
    nextCursor,
  });
}

