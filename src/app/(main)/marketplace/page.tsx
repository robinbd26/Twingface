import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeMarketplaceListingSelect } from '@/lib/marketplace';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import MarketplaceBrowser from '@/components/marketplace/marketplace-browser';

export default async function MarketplacePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const rows = await prisma.marketplaceListing.findMany({ where: { status: 'AVAILABLE' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 25, select: safeMarketplaceListingSelect });
  const listings = rows.slice(0, 24);
  const nextCursor = rows.length > 24 ? listings.at(-1)?.id ?? null : null;
  return <div className='app-shell' data-theme='dark'><DashboardNavbar user={user} /><main className='marketplace-page'><MarketplaceBrowser initialListings={listings} initialNextCursor={nextCursor} /></main></div>;
}
