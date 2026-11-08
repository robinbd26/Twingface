import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import GamesWorkspace from '@/components/games/games-workspace';

export const metadata: Metadata = { title: 'Play games - Twingface' };

export default async function GamesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={{ name: user.name, username: user.username, profileImage: user.profileImage }} />
      <GamesWorkspace />
    </div>
  );
}
