import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';

export const metadata: Metadata = { title: 'OTT Platform - Twingface' };

export default async function OttPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={{ name: user.name, username: user.username, profileImage: user.profileImage }} />
      <main className='fb-layout'>
        <section className='fb-main'>
          <div className='empty-feed surface' data-testid='coming-soon-ott'>
            <strong>OTT streaming is not available yet</strong>
            <span>There is no video catalogue or player behind this page, so nothing can be watched here yet.</span>
            <Link className='fb-btn fb-btn-primary' href='/dashboard'>Back to feed</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
