import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { makePairKey } from '@/lib/relationship';

type Context = { params: Promise<{ username: string }> };

/**
 * Opens (or reopens) a direct conversation from a Media World public profile.
 * Media World conversations are allowed without a friendship, mirroring the
 * Marketplace inquiry flag, but the exception lives on this conversation only.
 */
export async function POST(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const { username } = await params;
  const target = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, accountType: true },
  });
  if (!target || !target.accountType) return NextResponse.json({ error: 'Media World profile not found.' }, { status: 404 });
  if (target.id === user.id) {
    return NextResponse.json({ error: 'You cannot message your own profile.' }, { status: 400 });
  }

  const pairKey = makePairKey(user.id, target.id);
  const [participantOneId, participantTwoId] = [user.id, target.id].sort();
  try {
    const conversation = await prisma.directConversation.upsert({
      where: { pairKey },
      create: { pairKey, participantOneId, participantTwoId, mediaWorldMessagingEnabled: true },
      update: { mediaWorldMessagingEnabled: true },
      select: { id: true },
    });
    return NextResponse.json({ conversationId: conversation.id });
  } catch (error) {
    console.error('[mediaworld/talent/message POST] error:', error);
    return NextResponse.json({ error: 'Unable to start that conversation.' }, { status: 500 });
  }
}
