import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import GroupForm from '@/components/groups/group-form';
export default async function CreateGroupPage() { const user = await getCurrentUser(); if (!user) redirect('/login'); return <div className='app-shell' data-theme='dark'><DashboardNavbar user={user} /><main className='fb-layout'><section className='fb-main'><h1 className='fb-card-title'>Create group</h1><GroupForm /></section></main></div>; }
