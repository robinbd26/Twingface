import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';

export const metadata: Metadata = { title: 'Live streaming - Twingface' };

export default async function LivePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={{ name: user.name, username: user.username, profileImage: user.profileImage }} />
      <main className='fb-layout'>
        <section className='fb-main'>
          <div className='empty-feed surface' data-testid='coming-soon-live'>
            <strong>Live streaming is coming soon</strong>
            <span>Go live and chat with your audience in real time.</span>
            <Link className='fb-btn fb-btn-primary' href='/dashboard'>Back to feed</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
