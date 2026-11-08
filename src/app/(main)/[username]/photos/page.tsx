import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicPhotoGallery from './public-photo-gallery';
import { prisma } from '@/lib/db';
import { safeProfileSelect } from '@/lib/profile';
import {
  DEFAULT_PROFILE_PHOTOS_PER_PAGE,
  profilePhotoQuery,
  safeProfilePhotoSelect,
} from '@/lib/profile-photos';

export const metadata: Metadata = { title: 'Photos - Twingface' };

export default async function PublicPhotosPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: safeProfileSelect });
  if (!profile) notFound();

  const photos = await prisma.post.findMany({
    ...profilePhotoQuery(profile.id, DEFAULT_PROFILE_PHOTOS_PER_PAGE + 1),
    select: safeProfilePhotoSelect,
  });
  const hasMore = photos.length > DEFAULT_PROFILE_PHOTOS_PER_PAGE;
  const pagePhotos = (hasMore ? photos.slice(0, DEFAULT_PROFILE_PHOTOS_PER_PAGE) : photos).filter((photo) => typeof photo.imageUrl === 'string');
  const nextCursor = hasMore ? pagePhotos.at(-1)?.id ?? null : null;

  return (
    <main className='app-shell public-photo-page' data-theme='dark'>
      <section className='public-photo-gallery surface'>
        <div className='public-photo-gallery-head'>
          <div><p>Photos</p><h1>{profile.name}</h1></div>
          <Link className='fb-see-all' href={`/${profile.username}`}>Back to profile</Link>
        </div>
        <PublicPhotoGallery username={profile.username} profileName={profile.name} initialPhotos={pagePhotos} initialNextCursor={nextCursor} />
      </section>
    </main>
  );
}
