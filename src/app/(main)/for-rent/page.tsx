import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import ForRentBrowser from '@/components/for-rent/for-rent-browser';
import { MediaWorldLanguageProvider } from '@/components/mediaworld/mediaworld-language';
import { getCurrentUser } from '@/lib/auth';
import {
  browseRentalListings,
  DEFAULT_RENTAL_BROWSE_INPUT,
  parseRentalBrowseParams,
  searchParamsFromRecord,
} from '@/lib/mediaworld/rental-browse';
import { getTaxonomySnapshot } from '@/lib/mediaworld/taxonomy';

export const metadata = { title: 'For Rent - TwingFace Media World' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ForRentPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const parsed = parseRentalBrowseParams(searchParamsFromRecord(await searchParams));
  const filters = parsed.success ? parsed.data : DEFAULT_RENTAL_BROWSE_INPUT;
  const [{ listings, nextCursor }, taxonomy] = await Promise.all([browseRentalListings(filters), getTaxonomySnapshot()]);

  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={user} />
      <main className='mw-rent-page'>
        <MediaWorldLanguageProvider>
          <ForRentBrowser
            filters={filters}
            initialListings={listings}
            initialNextCursor={nextCursor}
            rentalCategories={taxonomy.rentalCategories}
            filtersIgnored={!parsed.success}
          />
        </MediaWorldLanguageProvider>
      </main>
    </div>
  );
}
