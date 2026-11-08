import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTaxonomySnapshot } from '@/lib/mediaworld/taxonomy';
import { loadOnboardingState } from '@/lib/mediaworld/onboarding';
import {
  MediaWorldLanguageProvider,
  MediaWorldLanguageToggle,
} from '@/components/mediaworld/mediaworld-language';
import OnboardingWizard from '@/components/mediaworld/onboarding/onboarding-wizard';
import SetupWizard, { type SetupPersonal } from '@/components/mediaworld/onboarding/setup-wizard';

export const metadata = { title: 'Media World Registration - Twingface' };

export default async function MediaWorldRegisterPage() {
  const [user, taxonomy] = await Promise.all([getCurrentUser(), getTaxonomySnapshot()]);
  const state = user ? await loadOnboardingState(user.id) : null;

  const isProfessional = state?.accountType === 'PROFESSIONAL';
  const account = isProfessional && user
    ? await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        phone: true,
        division: true,
        district: true,
        presentAddress: true,
        bio: true,
        username: true,
        profileImage: true,
      },
    })
    : null;

  const personal: SetupPersonal | null = account
    ? {
      name: account.name,
      email: account.email ?? '',
      phone: account.phone ?? '',
      division: account.division ?? '',
      district: account.district ?? '',
      presentAddress: account.presentAddress ?? '',
      bio: account.bio ?? '',
    }
    : null;

  const setupComplete = isProfessional && Boolean(account?.username && state && state.identities.length > 0);

  if (setupComplete && account?.username) {
    redirect(`/mediaworld/talent/${encodeURIComponent(account.username)}`);
  }

  return (
    <div className="app-shell page-enter" data-theme="dark">
      <MediaWorldLanguageProvider>
        <main className="mw-onb-shell">
          <section>
            <div className={`fb-card surface mw-onb-card${state && !isProfessional ? '' : ' mw-onb-card-wide'}`}>
              <div className="mediaworld-language-bar" style={{ justifyContent: 'flex-end' }}>
                <MediaWorldLanguageToggle />
              </div>
              {state && !isProfessional ? (
                <OnboardingWizard taxonomy={taxonomy} state={state} userName={user?.name ?? ''} />
              ) : (
                <SetupWizard
                  taxonomy={taxonomy}
                  authenticated={Boolean(user)}
                  initialPersonal={personal}
                  initialIdentities={state?.identities ?? []}
                  initialUsername={account?.username ?? null}
                  initialPhoto={account?.profileImage ?? null}
                />
              )}
              {user ? null : (
                <p className="mw-onb-note" style={{ marginTop: 22 }}>
                  Already registered? <Link href="/login">Sign in</Link> to manage your profile.
                </p>
              )}
              <p className="mw-onb-note" style={{ marginTop: 22 }}>
                Casting directors and crew who were referred by a legacy casting link can still submit the{' '}
                <Link href="/mediaworld/talent-profile">single-profession casting profile</Link> for Super Admin review.
              </p>
            </div>
          </section>
        </main>
      </MediaWorldLanguageProvider>
    </div>
  );
}
