import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CreateDirectMessageSchema, parseMessageLimit, safeDirectMessageSelect } from '@/lib/message';
import { makePairKey } from '@/lib/relationship';

type Context = { params: Promise<{ id: string }> };

async function getAuthorisedConversation(id: string, viewerId: string) {
  const conversation = await prisma.directConversation.findUnique({
    where: { id },
    select: { id: true, participantOneId: true, participantTwoId: true, marketplaceMessagingEnabled: true, mediaWorldMessagingEnabled: true },
  });
  if (!conversation) return { conversation: null, response: NextResponse.json({ error: 'Conversation not found.' }, { status: 404 }) };
  if (conversation.participantOneId !== viewerId && conversation.participantTwoId !== viewerId) {
    return { conversation: null, response: NextResponse.json({ error: 'You are not allowed to access this conversation.' }, { status: 403 }) };
  }
  const friendship = await prisma.friendship.findUnique({
    where: { pairKey: makePairKey(conversation.participantOneId, conversation.participantTwoId) },
    select: { status: true },
  });
  if (friendship?.status !== 'ACCEPTED' && !conversation.marketplaceMessagingEnabled && !conversation.mediaWorldMessagingEnabled) {
    return { conversation: null, response: NextResponse.json({ error: 'Messaging is available after both users become friends.' }, { status: 403 }) };
  }
  return { conversation, response: null };
}

export async function GET(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { id } = await params;
  const access = await getAuthorisedConversation(id, user.id);
  if (access.response) return access.response;
  await prisma.directMessage.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, isRead: false },
    data: { isRead: true },
  });
  const { searchParams } = new URL(request.url);
  const limit = parseMessageLimit(searchParams.get('limit'));
  const cursor = searchParams.get('cursor') || undefined;
  const rows = await prisma.directMessage.findMany({
    where: { conversationId: id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: safeDirectMessageSelect,
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const messages = [...page].reverse();
  return NextResponse.json({ messages, nextCursor: hasMore ? page.at(-1)?.id ?? null : null });
}

export async function POST(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { id } = await params;
  const access = await getAuthorisedConversation(id, user.id);
  if (access.response) return access.response;
  const input = CreateDirectMessageSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.directMessage.create({
      data: { conversationId: id, senderId: user.id, content: input.data.content },
      select: safeDirectMessageSelect,
    });
    await tx.directConversation.update({ where: { id }, data: { lastMessageAt: created.createdAt } });
    return created;
  });
  return NextResponse.json({ message }, { status: 201 });
}
