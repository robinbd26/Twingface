import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import MarketplaceForm from '@/components/marketplace/marketplace-form';

export default async function CreateMarketplaceListingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <div className='app-shell' data-theme='dark'><DashboardNavbar user={user} /><main className='marketplace-page'><h1>Sell something</h1><MarketplaceForm /></main></div>;
}
