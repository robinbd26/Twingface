import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MEDIA_WORLD_SERVICE_CATEGORIES, safeMediaWorldListingSelect } from '@/lib/mediaworld';
import { browseDirectoryTalents } from '@/lib/mediaworld/talent-browse';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import MediaWorldPlatform from '@/components/mediaworld/mediaworld-platform';

export const metadata = { title: 'MediaWorld - Twingface' };

export default async function MediaworldPage() {
  const user = await getCurrentUser();
  if (user?.role === 'SUPER_ADMIN') redirect('/super_admin');

  const [rows, talents, member] = await Promise.all([
    prisma.marketplaceListing.findMany({
      where: { status: 'AVAILABLE', category: { in: [...MEDIA_WORLD_SERVICE_CATEGORIES] } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 25,
      select: safeMediaWorldListingSelect,
    }),
    browseDirectoryTalents(),
    // A media talent profile 404s without an account type, so those accounts are sent to the wizard that creates one.
    user ? prisma.user.findUnique({ where: { id: user.id }, select: { accountType: true } }) : Promise.resolve(null),
  ]);
  let profileCta: { href: string; kind: 'open' | 'create' } | undefined;
  if (user) {
    profileCta = member?.accountType
      ? { href: `/mediaworld/talent/${user.username}`, kind: 'open' }
      : { href: '/mediaworld/register', kind: 'create' };
  }
  return (
    <div className='app-shell page-enter' data-theme='dark'>
      {user ? (
        <DashboardNavbar user={{ name: user.name, username: user.username, profileImage: user.profileImage }} />
      ) : null}
      <main className='mediaworld-page'>
        <MediaWorldPlatform
          initialListings={rows}
          initialTalents={talents}
          authenticated={!!user}
          profileCta={profileCta}
          memberAvatar={user ? { name: user.name, image: user.profileImage } : undefined}
        />
      </main>
    </div>
  );
}
