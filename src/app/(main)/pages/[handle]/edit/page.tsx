import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safePageSelect } from '@/lib/page';
import EditPageForm from './edit-page-form';

export const metadata: Metadata = { title: 'Edit Page - Twingface' };

type Props = { params: Promise<{ handle: string }> };

export default async function EditPagePage({ params }: Props) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  const { handle } = await params;
  const page = await prisma.page.findUnique({ where: { handle: handle.toLowerCase() }, select: safePageSelect });
  if (!page) notFound();
  if (page.ownerId !== currentUser.id) redirect(`/pages/${page.handle}`);
  return (
    <main className='container profile-page'>
      <section className='profile-card'>
        <h1>Edit Page</h1>
        <p style={{ color: 'var(--mute)', marginTop: 6 }}>Update your page details, profile image, and cover image.</p>
        <EditPageForm page={page} />
        <p style={{ marginTop: 14 }}><Link className='link' href={`/pages/${page.handle}`}>Back to page</Link></p>
      </section>
    </main>
  );
}