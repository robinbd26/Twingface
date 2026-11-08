import { notFound, redirect } from 'next/navigation';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import TalentProfileView from '@/components/mediaworld/talent/talent-profile';
import { MediaWorldLanguageProvider } from '@/components/mediaworld/mediaworld-language';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { talentProfileSelect } from '@/lib/mediaworld/talent-browse';
import { prepareTalentProfile } from '@/lib/mediaworld/talent-profile-view';
import { rentalListingCardSelect } from '@/lib/mediaworld/rental';

export const metadata = { title: 'Talent profile - TwingFace Media World' };

type Props = { params: Promise<{ username: string }> };

export default async function MediaworldTalentProfilePage({ params }: Props) {
  const userPromise = getCurrentUser();
  const { username } = await params;
  const [user, profile] = await Promise.all([
    userPromise,
    prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: talentProfileSelect }),
  ]);
  if (!user) redirect('/login');
  if (!profile) notFound();
  // Without an account type there is no Media World profile here; the /{username} wall page owns plain accounts.
  if (!profile.accountType) notFound();

  const [listings, follow] = await Promise.all([
    profile.rentalProvider
      ? prisma.rentalListing.findMany({
          where: { providerId: profile.rentalProvider.id, isActive: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 9,
          select: rentalListingCardSelect,
        })
      : Promise.resolve([]),
    profile.id === user.id
      ? Promise.resolve(null)
      : prisma.talentFollow.findUnique({
          where: { followerId_followingId: { followerId: user.id, followingId: profile.id } },
          select: { followerId: true },
        }),
  ]);

  const isOwner = user.id === profile.id;
  const { profile: publicProfile, hidden } = prepareTalentProfile(profile, isOwner);

  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={user} />
      <main className='mw-talent-page max-w-none! px-0! py-0!'>
        <MediaWorldLanguageProvider>
          <TalentProfileView
            profile={publicProfile}
            hidden={hidden}
            listings={listings}
            isOwner={isOwner}
            viewerFollows={Boolean(follow)}
          />
        </MediaWorldLanguageProvider>
      </main>
    </div>
  );
}
