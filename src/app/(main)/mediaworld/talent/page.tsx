import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import TalentBrowser from '@/components/mediaworld/talent/talent-browser';
import { MediaWorldLanguageProvider } from '@/components/mediaworld/mediaworld-language';
import { getCurrentUser } from '@/lib/auth';
import {
  browseTalents,
  DEFAULT_TALENT_BROWSE_INPUT,
  parseTalentBrowseParams,
  searchParamsFromRecord,
} from '@/lib/mediaworld/talent-browse';
import { getTaxonomySnapshot } from '@/lib/mediaworld/taxonomy';

export const metadata = { title: 'Find talent - TwingFace Media World' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MediaworldTalentPage({ searchParams }: Props) {
  const userPromise = getCurrentUser();
  const parsed = parseTalentBrowseParams(searchParamsFromRecord(await searchParams));
  const filters = parsed.success ? parsed.data : DEFAULT_TALENT_BROWSE_INPUT;
  const [user, [{ talents, nextCursor }, taxonomy]] = await Promise.all([
    userPromise,
    Promise.all([browseTalents(filters), getTaxonomySnapshot()]),
  ]);
  if (!user) redirect('/login');

  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={user} />
      <main className='mw-talent-page'>
        <MediaWorldLanguageProvider>
          <TalentBrowser
            filters={filters}
            initialTalents={talents}
            initialNextCursor={nextCursor}
            industries={taxonomy.industries}
            filtersIgnored={!parsed.success}
          />
        </MediaWorldLanguageProvider>
      </main>
    </div>
  );
}
