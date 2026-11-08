import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { countMutualFriendsBatch, safeFriendUserSelect } from '@/lib/relationship';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import FriendsTabs from '@/components/friends/friends-tabs';

export const metadata: Metadata = { title: 'Friends - Twingface' };

export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [pendingRows, friendshipRows] = await Promise.all([
    prisma.friendship.findMany({
      where: { status: 'PENDING', recipientId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, requesterId: true, requester: { select: safeFriendUserSelect } },
    }),
    prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: user.id }, { recipientId: user.id }] },
      orderBy: { updatedAt: 'desc' },
      select: { requesterId: true, requester: { select: safeFriendUserSelect }, recipient: { select: safeFriendUserSelect } },
    }),
  ]);

  const mutualById = await countMutualFriendsBatch(user.id, pendingRows.map((row) => row.requesterId), prisma);

  const requests = pendingRows.map((row) => ({
    id: row.id,
    user: row.requester,
    mutualFriends: mutualById.get(row.requesterId) ?? 0,
  }));
  const friends = friendshipRows.map((row) => (row.requesterId === user.id ? row.recipient : row.requester));

  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={{ name: user.name, username: user.username, profileImage: user.profileImage }} />
      <main className='fb-layout'>
        <section className='fb-main'>
          <header className='fb-card surface'>
            <h1 className='fb-card-title'>Friends</h1>
            <p className='fb-friends-count'>{friends.length} {friends.length === 1 ? 'friend' : 'friends'} · {requests.length} pending {requests.length === 1 ? 'request' : 'requests'}</p>
          </header>
          <FriendsTabs requests={requests} friends={friends} />
        </section>
      </main>
    </div>
  );
}
