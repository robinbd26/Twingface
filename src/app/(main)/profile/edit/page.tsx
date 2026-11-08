import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeProfileSelect } from '@/lib/profile';
import ProfileForm from './profile-form';

export default async function EditProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  const profile = await prisma.user.findUnique({ where: { id: currentUser.id }, select: safeProfileSelect });
  if (!profile) redirect('/login');
  return <main className='container profile-page'><section className='profile-card'><h1>Edit profile</h1><ProfileForm profile={profile} /></section></main>;
}
