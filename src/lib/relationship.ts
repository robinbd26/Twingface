import type { Prisma } from '@prisma/client';

export type RelationshipState = 'NONE' | 'OUTGOING_PENDING' | 'INCOMING_PENDING' | 'ACCEPTED';

export const safeFriendUserSelect = {
  id: true,
  name: true,
  username: true,
  profileImage: true,
} satisfies Prisma.UserSelect;

export function makePairKey(firstUserId: string, secondUserId: string): string {
  if (firstUserId === secondUserId) throw new Error('You cannot create a relationship with yourself.');
  return [firstUserId, secondUserId].sort().join(':');
}

// The set of user ids that are "friends" with the given user (either side of an accepted friendship).
export async function acceptedFriendIds(userId: string, client: {
  friendship: { findMany: (args: Prisma.FriendshipFindManyArgs) => Promise<Array<{ requesterId: string; recipientId: string }>> };
}): Promise<Set<string>> {
  const rows = await client.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { recipientId: userId }] },
    select: { requesterId: true, recipientId: true },
  });
  const ids = new Set<string>();
  for (const row of rows) ids.add(row.requesterId === userId ? row.recipientId : row.requesterId);
  ids.delete(userId);
  return ids;
}

// Number of shared accepted friends between two users.
export async function countMutualFriends(
  viewerId: string,
  otherId: string,
  client: Parameters<typeof acceptedFriendIds>[1],
): Promise<number> {
  if (viewerId === otherId) return 0;
  const [viewerFriends, otherFriends] = await Promise.all([
    acceptedFriendIds(viewerId, client),
    acceptedFriendIds(otherId, client),
  ]);
  let count = 0;
  for (const id of viewerFriends) if (otherFriends.has(id)) count += 1;
  return count;
}

// Batched version for lists (e.g. pending friend requests): fetches the
// viewer's friends once and each candidate's friends in a single query,
// instead of 2 queries per row (the classic N+1 that slowed the dashboard).
export async function countMutualFriendsBatch(
  viewerId: string,
  otherIds: string[],
  client: {
    friendship: { findMany: (args: Prisma.FriendshipFindManyArgs) => Promise<Array<{ requesterId: string; recipientId: string }>> };
  },
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const uniqueOthers = [...new Set(otherIds.filter((id) => id !== viewerId))];
  if (!uniqueOthers.length) return counts;

  const [viewerFriends, otherRows] = await Promise.all([
    acceptedFriendIds(viewerId, client),
    client.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: { in: uniqueOthers } }, { recipientId: { in: uniqueOthers } }] },
      select: { requesterId: true, recipientId: true },
    }),
  ]);

  const friendsByUser = new Map<string, Set<string>>();
  for (const id of uniqueOthers) friendsByUser.set(id, new Set());
  for (const row of otherRows) {
    // Attribute the friendship to whichever endpoint is in our candidate set.
    for (const owner of [row.requesterId, row.recipientId]) {
      const set = friendsByUser.get(owner);
      if (set) set.add(owner === row.requesterId ? row.recipientId : row.requesterId);
    }
  }

  for (const id of uniqueOthers) {
    let count = 0;
    for (const friendId of friendsByUser.get(id) ?? []) if (viewerFriends.has(friendId)) count += 1;
    counts.set(id, count);
  }
  return counts;
}

export function getRelationshipState(
  viewerId: string,
  relationship: { requesterId: string; recipientId: string; status: 'PENDING' | 'ACCEPTED' | 'REJECTED' } | null,
): RelationshipState {
  if (!relationship || relationship.status === 'REJECTED') return 'NONE';
  if (relationship.status === 'ACCEPTED') return 'ACCEPTED';
  return relationship.requesterId === viewerId ? 'OUTGOING_PENDING' : 'INCOMING_PENDING';
}
