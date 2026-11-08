import { notFound, redirect } from 'next/navigation';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import ForRentListingForm from '@/components/for-rent/for-rent-listing-form';
import { MediaWorldLanguageProvider } from '@/components/mediaworld/mediaworld-language';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rentalFormFromListing } from '@/lib/mediaworld/rental-form';
import { rentalListingDetailPageSelect } from '@/lib/mediaworld/rental';
import { getTaxonomySnapshot } from '@/lib/mediaworld/taxonomy';

export const metadata = { title: 'Edit rental listing - TwingFace Media World' };

type Props = { params: Promise<{ id: string }> };

export default async function EditRentalListingPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  if (!/^[a-z0-9]{1,40}$/i.test(id)) notFound();

  const [listing, taxonomy] = await Promise.all([
    prisma.rentalListing.findUnique({ where: { id }, select: rentalListingDetailPageSelect }),
    getTaxonomySnapshot(),
  ]);
  // Non-owners get the same 404 as a missing listing so ids cannot be probed.
  if (!listing || listing.provider.userId !== user.id) notFound();

  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={user} />
      <main className='mw-rent-page'>
        <MediaWorldLanguageProvider>
          <ForRentListingForm
            mode='edit'
            listingId={listing.id}
            rentalCategories={taxonomy.rentalCategories}
            initial={rentalFormFromListing(listing)}
            existingPhotos={listing.photos.map((photo) => ({ id: photo.id, url: photo.url }))}
          />
        </MediaWorldLanguageProvider>
      </main>
    </div>
  );
}
