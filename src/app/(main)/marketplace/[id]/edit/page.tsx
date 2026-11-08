import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeMarketplaceListingSelect } from '@/lib/marketplace';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import MarketplaceForm from '@/components/marketplace/marketplace-form';

export default async function EditMarketplaceListingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { id } = await params;
  const listing = await prisma.marketplaceListing.findUnique({ where: { id }, select: safeMarketplaceListingSelect });
  if (!listing || listing.sellerId !== user.id) notFound();
  return <div className='app-shell' data-theme='dark'><DashboardNavbar user={user} /><main className='marketplace-page'><h1>Edit listing</h1><MarketplaceForm listing={listing} /></main></div>;
}
