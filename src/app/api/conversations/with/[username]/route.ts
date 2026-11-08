import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canUseDirectConversation, safeConversationSelect } from '@/lib/message';
import { makePairKey } from '@/lib/relationship';

type Context = { params: Promise<{ username: string }> };

export async function POST(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { username } = await params;
  const otherUser = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
  if (!otherUser) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  if (otherUser.id === user.id) return NextResponse.json({ error: 'You cannot open a conversation with yourself.' }, { status: 400 });

  const pairKey = makePairKey(user.id, otherUser.id);
  if (!await canUseDirectConversation({ viewerId: user.id, otherUserId: otherUser.id, pairKey }, prisma)) return NextResponse.json({ error: 'Messaging is available after both users become friends.' }, { status: 403 });

  const [participantOneId, participantTwoId] = [user.id, otherUser.id].sort();
  const conversation = await prisma.directConversation.upsert({
    where: { pairKey }, create: { pairKey, participantOneId, participantTwoId }, update: {}, select: safeConversationSelect,
  });
  return NextResponse.json({ conversation });
}
