import { notFound, redirect } from 'next/navigation';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import ForRentDetail from '@/components/for-rent/for-rent-detail';
import { MediaWorldLanguageProvider } from '@/components/mediaworld/mediaworld-language';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rentalListingDetailPageSelect } from '@/lib/mediaworld/rental';

export const metadata = { title: 'For Rent listing - TwingFace Media World' };

type Props = { params: Promise<{ id: string }> };

export default async function ForRentDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  if (!/^[a-z0-9]{1,40}$/i.test(id)) notFound();

  const listing = await prisma.rentalListing.findUnique({ where: { id }, select: rentalListingDetailPageSelect });
  if (!listing) notFound();

  const isOwner = listing.provider.userId === user.id;
  if (!listing.isActive && !isOwner) notFound();

  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={user} />
      <main className='mw-rent-page'>
        <MediaWorldLanguageProvider>
          <ForRentDetail listing={listing} isOwner={isOwner} viewer={{ name: user.name, email: user.email ?? '' }} />
        </MediaWorldLanguageProvider>
      </main>
    </div>
  );
}
