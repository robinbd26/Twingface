import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import ForRentGate from '@/components/for-rent/for-rent-gate';
import ForRentListingForm from '@/components/for-rent/for-rent-listing-form';
import { MediaWorldLanguageProvider } from '@/components/mediaworld/mediaworld-language';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { EMPTY_RENTAL_FORM } from '@/lib/mediaworld/rental-form';
import { getTaxonomySnapshot } from '@/lib/mediaworld/taxonomy';

export const metadata = { title: 'New rental listing - TwingFace Media World' };

export default async function NewRentalListingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [taxonomy, provider] = await Promise.all([
    getTaxonomySnapshot(),
    prisma.rentalProvider.findUnique({ where: { userId: user.id }, select: { id: true } }),
  ]);

  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={user} />
      <main className='mw-rent-page'>
        <MediaWorldLanguageProvider>
          {provider ? (
            <ForRentListingForm
              mode='create'
              rentalCategories={taxonomy.rentalCategories}
              initial={EMPTY_RENTAL_FORM}
              existingPhotos={[]}
            />
          ) : (
            <ForRentGate />
          )}
        </MediaWorldLanguageProvider>
      </main>
    </div>
  );
}
