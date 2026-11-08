import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeMarketplaceListingSelect } from '@/lib/marketplace';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import MarketplaceGallery from '@/components/marketplace/marketplace-gallery';
import MarketplaceInquiry from '@/components/marketplace/marketplace-inquiry';
import MarketplaceOwnerActions from '@/components/marketplace/marketplace-owner-actions';
import { formatMarketplacePrice } from '@/components/marketplace/marketplace-card';

export default async function MarketplaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { id } = await params;
  const listing = await prisma.marketplaceListing.findUnique({ where: { id }, select: safeMarketplaceListingSelect });
  if (!listing) notFound();
  const owner = listing.sellerId === user.id;
  return <div className='app-shell' data-theme='dark'><DashboardNavbar user={user} /><main className='marketplace-page marketplace-detail'><MarketplaceGallery images={listing.images} title={listing.title} /><section className='marketplace-detail-info surface'><span className={`marketplace-status ${listing.status === 'AVAILABLE' ? 'available' : 'sold'}`}>{listing.status === 'AVAILABLE' ? 'Available' : 'Sold out'}</span><h1>{listing.title}</h1><strong className='marketplace-price'>{formatMarketplacePrice(listing.pricePaisa)}</strong><p>{listing.description}</p><dl><div><dt>Condition</dt><dd>{listing.condition === 'NEW' ? 'New' : 'Used'}</dd></div><div><dt>Location</dt><dd>{listing.location}</dd></div></dl><p>Seller: <Link href={`/${listing.seller.username}`}>{listing.seller.name}</Link></p>{owner ? <MarketplaceOwnerActions listingId={listing.id} status={listing.status} /> : <MarketplaceInquiry listingId={listing.id} disabled={listing.status === 'SOLD_OUT'} />}</section></main></div>;
}
