import Image from 'next/image';
import Link from 'next/link';
import type { SafeProfilePhoto } from '@/lib/profile-photos';

type ProfilePhotosProps = { photos: SafeProfilePhoto[]; username: string };

export default function ProfilePhotos({ photos, username }: ProfilePhotosProps) {
  const visiblePhotos = photos.filter((photo): photo is SafeProfilePhoto & { imageUrl: string } => typeof photo.imageUrl === 'string');

  return (
    <section className='fb-card surface' aria-label='Photos'>
      <div className='fb-card-head'>
        <h2>Photos</h2>
        <Link className='fb-see-all' href={`/${username}/photos`}>See all photos</Link>
      </div>
      {visiblePhotos.length ? (
        <div className='fb-photo-grid'>
          {visiblePhotos.map((photo) => (
            <Link className='fb-photo fb-photo-image' href={`/${username}/photos`} key={photo.id}>
              <Image src={photo.imageUrl} alt={`Photo posted on ${new Date(photo.createdAt).toLocaleDateString()}`} fill sizes='(max-width: 959px) 30vw, 130px' />
            </Link>
          ))}
        </div>
      ) : <p className='fb-photo-empty'>No photos yet</p>}
    </section>
  );
}
