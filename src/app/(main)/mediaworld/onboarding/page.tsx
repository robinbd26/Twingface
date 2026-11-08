import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getTaxonomySnapshot } from '@/lib/mediaworld/taxonomy';
import { loadOnboardingState } from '@/lib/mediaworld/onboarding';
import {
  MediaWorldLanguageProvider,
  MediaWorldLanguageToggle,
} from '@/components/mediaworld/mediaworld-language';
import OnboardingWizard from '@/components/mediaworld/onboarding/onboarding-wizard';

export const metadata = { title: 'Media World Profile Setup' };

export default async function MediaWorldOnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [taxonomy, state] = await Promise.all([getTaxonomySnapshot(), loadOnboardingState(user.id)]);

  return (
    <div className="app-shell page-enter" data-theme="dark">
      <MediaWorldLanguageProvider>
        <main className="fb-layout">
          <section className="fb-main">
            <div className="fb-card surface mw-onb-card">
              <div className="mediaworld-language-bar" style={{ justifyContent: 'flex-end' }}>
                <MediaWorldLanguageToggle />
              </div>
              <OnboardingWizard taxonomy={taxonomy} state={state} userName={user.name} />
            </div>
          </section>
        </main>
      </MediaWorldLanguageProvider>
    </div>
  );
}
