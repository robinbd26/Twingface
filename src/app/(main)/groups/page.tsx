import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeGroupSelect } from '@/lib/group';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';

export default async function GroupsPage() {
  const user = await getCurrentUser(); if (!user) redirect('/login');
  const [myGroups, discover] = await Promise.all([
    prisma.group.findMany({ where: { memberships: { some: { userId: user.id, status: 'APPROVED' } } }, select: safeGroupSelect, orderBy: { createdAt: 'desc' } }),
    prisma.group.findMany({ where: { privacy: 'PUBLIC' }, select: safeGroupSelect, orderBy: { createdAt: 'desc' } }),
  ]);
  return <div className='app-shell' data-theme='dark'><DashboardNavbar user={user} /><main className='fb-layout groups-page'><aside className='fb-left'><section className='fb-card surface'><h1 className='fb-card-title'>Groups</h1><Link className='fb-btn fb-btn-primary' href='/groups/create'>Create group</Link><h2>Your groups</h2>{myGroups.length ? myGroups.map((g) => <Link key={g.id} href={`/groups/${g.handle}`} className='group-list-link'>{g.name}</Link>) : <p className='fb-photo-empty'>You have not joined any groups yet.</p>}</section></aside><section className='fb-main'><h2 className='fb-card-title'>Discover groups</h2>{discover.length ? discover.map((g) => <article key={g.id} className='fb-card surface'><h2>{g.name}</h2><p className='fb-friends-count'>{g._count.memberships} members · {g.privacy.toLowerCase()}</p>{g.description ? <p>{g.description}</p> : null}<Link className='fb-see-all' href={`/groups/${g.handle}`}>View group</Link></article>) : <div className='empty-feed surface'>No public groups yet.</div>}</section></main></div>;
}
