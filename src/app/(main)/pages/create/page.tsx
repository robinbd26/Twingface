import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import CreatePageForm from './create-page-form';

export const metadata: Metadata = { title: 'Create Page - Twingface' };

export default async function CreatePagePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  return (
    <main className='container profile-page'>
      <section className='profile-card'>
        <h1>Create a Page</h1>
        <p style={{ color: 'var(--mute)', marginTop: 6 }}>Pages are public profiles for businesses, brands, communities, and creators.</p>
        <CreatePageForm />
        <p style={{ marginTop: 14 }}><Link className='link' href='/pages'>Back to your pages</Link></p>
      </section>
    </main>
  );
}