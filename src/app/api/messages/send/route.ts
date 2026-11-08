import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canUseDirectConversation, SendMessageSchema, safeDirectMessageSelect } from '@/lib/message';
import { makePairKey } from '@/lib/relationship';
import { publishMessage } from '@/lib/realtime';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const input = SendMessageSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });
  const { receiverId, messageText, attachments } = input.data;

  if (receiverId === user.id) return NextResponse.json({ error: 'You cannot message yourself.' }, { status: 400 });

  const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } });
  if (!receiver) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const pairKey = makePairKey(user.id, receiverId);
  if (!await canUseDirectConversation({ viewerId: user.id, otherUserId: receiverId, pairKey }, prisma)) {
    return NextResponse.json({ error: 'Messaging is available after both users become friends.' }, { status: 403 });
  }

  const [participantOneId, participantTwoId] = [user.id, receiverId].sort();
  const message = await prisma.$transaction(async (tx) => {
    const conversation = await tx.directConversation.upsert({
      where: { pairKey },
      create: { pairKey, participantOneId, participantTwoId },
      update: {},
      select: { id: true },
    });
    const created = await tx.directMessage.create({
      data: { conversationId: conversation.id, senderId: user.id, content: messageText, attachments: attachments ?? [] },
      select: safeDirectMessageSelect,
    });
    await tx.directConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: created.createdAt } });
    return created;
  });

  // Fan the new message out to live SSE subscribers on both ends.
  publishMessage(message, receiverId);

  return NextResponse.json({ message }, { status: 201 });
}
