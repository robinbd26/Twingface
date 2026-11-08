'use client';

import { useState } from 'react';
import Image from 'next/image';

type Photo = {
  id: string;
  imageUrl: string | null;
  createdAt: Date | string;
};

type PhotoResponse = {
  photos?: Photo[];
  nextCursor?: string | null;
  error?: string;
};

export default function PublicPhotoGallery({
  username,
  profileName,
  initialPhotos,
  initialNextCursor,
}: {
  username: string;
  profileName: string;
  initialPhotos: Photo[];
  initialNextCursor: string | null;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/user/${encodeURIComponent(username)}/photos?cursor=${encodeURIComponent(nextCursor)}`);
      const data = await response.json().catch(() => null) as PhotoResponse | null;
      if (!response.ok || !data?.photos) throw new Error(data?.error ?? 'Unable to load more photos. Please try again.');
      const fetchedPhotos = data.photos;
      setPhotos((current) => [...current, ...fetchedPhotos.filter((photo) => typeof photo.imageUrl === 'string')]);
      setNextCursor(data.nextCursor ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load more photos. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!photos.length) return <p className='fb-photo-empty'>No photos yet</p>;

  return (
    <>
      <div className='public-photo-grid'>
        {photos.map((photo) => photo.imageUrl ? (
          <figure key={photo.id}>
            <Image src={photo.imageUrl} alt={`Photo posted by ${profileName} on ${new Date(photo.createdAt).toLocaleDateString()}`} fill sizes='(max-width: 700px) 50vw, 300px' />
          </figure>
        ) : null)}
      </div>
      {nextCursor ? <button type='button' className='public-photo-load-more' onClick={loadMore} disabled={loading}>{loading ? 'Loading photos…' : 'Load more photos'}</button> : null}
      {error ? <p className='public-photo-load-error' role='alert'>{error}</p> : null}
    </>
  );
}
