import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import MessagesWorkspace from '@/components/messages/messages-workspace';

export default async function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { id } = await params;
  return <div className='app-shell' data-theme='dark'><DashboardNavbar user={user} /><MessagesWorkspace viewerId={user.id} initialConversationId={id} /></div>;
}
