import { notFound, redirect } from 'next/navigation';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import TalentProfileEditor from '@/components/mediaworld/talent/talent-profile-editor';
import { MediaWorldLanguageProvider } from '@/components/mediaworld/mediaworld-language';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { loadOnboardingState } from '@/lib/mediaworld/onboarding';
import { talentProfileSelect } from '@/lib/mediaworld/talent-browse';
import { getTaxonomySnapshot } from '@/lib/mediaworld/taxonomy';

export const metadata = { title: 'Edit talent profile - TwingFace Media World' };

type Props = { params: Promise<{ username: string }> };

export default async function MediaworldTalentEditPage({ params }: Props) {
  const userPromise = getCurrentUser();
  const { username } = await params;
  const [user, profile] = await Promise.all([
    userPromise,
    prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: talentProfileSelect }),
  ]);
  if (!user) redirect('/login');
  if (!profile || !profile.accountType) notFound();
  // Editing is owner-only; anyone else gets a 404 rather than a hint that the editor exists.
  if (profile.id !== user.id) notFound();

  const [taxonomy, state] = await Promise.all([
    getTaxonomySnapshot(),
    loadOnboardingState(user.id),
  ]);

  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={user} />
      <main className='mw-talent-page'>
        <MediaWorldLanguageProvider>
          <TalentProfileEditor profile={profile} taxonomy={taxonomy} identities={state.identities} />
        </MediaWorldLanguageProvider>
      </main>
    </div>
  );
}
