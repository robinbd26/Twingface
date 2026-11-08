import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeMarketplaceListingSelect } from '@/lib/marketplace';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import MarketplaceCard from '@/components/marketplace/marketplace-card';

export default async function MyMarketplaceListingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const listings = await prisma.marketplaceListing.findMany({ where: { sellerId: user.id }, orderBy: { updatedAt: 'desc' }, select: safeMarketplaceListingSelect });
  return <div className='app-shell' data-theme='dark'><DashboardNavbar user={user} /><main className='marketplace-page'><h1>Your listings</h1><div className='marketplace-grid'>{listings.map((listing) => <MarketplaceCard key={listing.id} listing={listing} />)}</div></main></div>;
}
