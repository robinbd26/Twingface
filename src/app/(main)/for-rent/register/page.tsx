import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTaxonomySnapshot } from '@/lib/mediaworld/taxonomy';
import {
  MediaWorldLanguageProvider,
  MediaWorldLanguageToggle,
} from '@/components/mediaworld/mediaworld-language';
import RentalSignupForm from '@/components/for-rent/rental-signup-form';

export const metadata = { title: 'For Rent Registration - Twingface' };

const TITLE = {
  bn: 'ফর রেন্ট অ্যাকাউন্ট খুলুন',
  en: 'Open a For Rent account',
} as const;

export default async function ForRentRegisterPage() {
  const user = await getCurrentUser();

  if (user?.role === 'SUPER_ADMIN') redirect('/super_admin');

  const [taxonomy, account] = await Promise.all([
    getTaxonomySnapshot(),
    user
      ? prisma.user.findUnique({
        where: { id: user.id },
        select: { accountType: true, username: true, rentalProvider: { select: { id: true } } },
      })
      : Promise.resolve(null),
  ]);

  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <MediaWorldLanguageProvider>
        <main className='mw-onb-shell'>
          <section>
            <div className='fb-card surface mw-onb-card mw-onb-card-wide'>
              <div className='mediaworld-language-bar' style={{ justifyContent: 'flex-end' }}>
                <MediaWorldLanguageToggle />
              </div>
              <RentalSignupForm
                taxonomy={taxonomy}
                title={TITLE}
                authenticated={Boolean(user)}
                accountType={account?.accountType ?? null}
                username={account?.username ?? null}
                hasProvider={Boolean(account?.rentalProvider)}
              />
            </div>
          </section>
        </main>
      </MediaWorldLanguageProvider>
    </div>
  );
}
