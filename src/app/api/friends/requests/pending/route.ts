import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeFriendUserSelect } from '@/lib/relationship';
import { countMutualFriendsBatch } from '@/lib/relationship';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const pending = await prisma.friendship.findMany({
    where: { status: 'PENDING', recipientId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      requesterId: true,
      requester: { select: safeFriendUserSelect },
    },
  });

  // One batched mutual-count (2 queries total) instead of 2 per request row.
  const mutualById = await countMutualFriendsBatch(user.id, pending.map((row) => row.requesterId), prisma);

  const requests = pending.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    requesterId: row.requesterId,
    user: row.requester,
    mutualFriends: mutualById.get(row.requesterId) ?? 0,
  }));

  return NextResponse.json({ requests });
}
