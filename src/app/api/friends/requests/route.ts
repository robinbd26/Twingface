import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CreateFriendRequestSchema, safeFriendshipSelect } from '@/lib/friendship';
import { createNotification } from '@/lib/notification';
import { makePairKey } from '@/lib/relationship';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const requests = await prisma.friendship.findMany({
    where: { status: 'PENDING', OR: [{ requesterId: user.id }, { recipientId: user.id }] },
    orderBy: { createdAt: 'desc' },
    select: safeFriendshipSelect,
  });

  return NextResponse.json({
    incoming: requests.filter((request) => request.recipientId === user.id),
    outgoing: requests.filter((request) => request.requesterId === user.id),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const input = CreateFriendRequestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });

  const recipient = await prisma.user.findUnique({
    where: { username: input.data.username.toLowerCase() },
    select: { id: true },
  });
  if (!recipient) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  if (recipient.id === user.id) return NextResponse.json({ error: 'You cannot send a friend request to yourself.' }, { status: 400 });

  const pairKey = makePairKey(user.id, recipient.id);
  const existing = await prisma.friendship.findUnique({ where: { pairKey }, select: { id: true } });
  if (existing) return NextResponse.json({ error: 'A relationship already exists with this user.' }, { status: 409 });

  try {
    const friendRequest = await prisma.friendship.create({
      data: { pairKey, requesterId: user.id, recipientId: recipient.id, status: 'PENDING' },
      select: safeFriendshipSelect,
    });
    try {
      await createNotification({
        type: 'FRIEND_REQUEST',
        recipientId: recipient.id,
        actor: { id: user.id, name: user.name, username: user.username, profileImage: user.profileImage },
        entityId: friendRequest.id,
      });
    } catch {
      /* notification is best-effort; the request itself already succeeded */
    }
    return NextResponse.json({ request: friendRequest }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'A relationship already exists with this user.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Unable to send friend request. Please try again.' }, { status: 500 });
  }
}
