import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { FriendRequestActionSchema, safeFriendshipSelect } from '@/lib/friendship';
import { createNotification } from '@/lib/notification';

type Context = { params: Promise<{ id: string }> };

async function getRequest(id: string) {
  return prisma.friendship.findUnique({
    where: { id },
    select: { id: true, requesterId: true, recipientId: true, status: true },
  });
}

export async function PATCH(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { id } = await params;
  const friendRequest = await getRequest(id);
  if (!friendRequest) return NextResponse.json({ error: 'Friend request not found.' }, { status: 404 });
  if (friendRequest.status !== 'PENDING' || friendRequest.recipientId !== user.id) {
    return NextResponse.json({ error: 'You are not allowed to update this friend request.' }, { status: 403 });
  }

  const input = FriendRequestActionSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });
  const status = input.data.action === 'accept' ? 'ACCEPTED' : 'REJECTED';
  const updated = await prisma.friendship.update({ where: { id }, data: { status }, select: safeFriendshipSelect });

  // On accept, notify the original requester that their request was accepted.
  if (status === 'ACCEPTED') {
    try {
      await createNotification({
        type: 'FRIEND_ACCEPT',
        recipientId: friendRequest.requesterId,
        actor: { id: user.id, name: user.name, username: user.username, profileImage: user.profileImage },
        entityId: updated.id,
      });
    } catch {
      /* notification is best-effort; the friendship update already succeeded */
    }
  }
  return NextResponse.json({ request: updated });
}

export async function DELETE(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { id } = await params;
  const friendRequest = await getRequest(id);
  if (!friendRequest) return NextResponse.json({ error: 'Friend request not found.' }, { status: 404 });

  const isParticipant = friendRequest.requesterId === user.id || friendRequest.recipientId === user.id;
  const canCancelPending = friendRequest.status === 'PENDING' && friendRequest.requesterId === user.id;
  const canUnfriend = friendRequest.status === 'ACCEPTED' && isParticipant;
  if (!canCancelPending && !canUnfriend) {
    return NextResponse.json({ error: 'You are not allowed to remove this friend request.' }, { status: 403 });
  }

  await prisma.friendship.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
