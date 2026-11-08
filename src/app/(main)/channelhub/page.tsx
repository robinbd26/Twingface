import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'ChannelHub - Twingface' };

export default async function ChannelHubPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={{ name: user.name, username: user.username, profileImage: user.profileImage }} />
      <main className='channelhub-page'>
        <section className='channelhub-card'>
          <span className='channelhub-kicker'>ChannelHub</span>
          <h1>ChannelHub is coming soon</h1>
          <p>
            Creator channels, publishing tools and audience pages will live here. Until then you can build your
            professional profile or book media services from the rest of the platform.
          </p>
          <div className='channelhub-actions'>
            <Link className='channelhub-btn channelhub-btn-primary' href='/mediaworld'>← Back to Media World</Link>
            <Link className='channelhub-btn' href='/for-rent'>Browse for rent</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
