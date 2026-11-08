'use client';

import { useState } from 'react';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';

type Photo = { id: string; url: string };

export default function ForRentGallery({ title, photos }: { title: string; photos: Photo[] }) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const [active, setActive] = useState(0);

  if (!photos.length) {
    return (
      <div className='mw-rent-gallery'>
        <div className='mw-rent-stage empty'>{bn ? 'এই তালিকায় ছবি নেই' : 'No photos on this listing'}</div>
      </div>
    );
  }

  const index = Math.min(active, photos.length - 1);

  return (
    <div className='mw-rent-gallery'>
      <div className='mw-rent-stage'>
        <img src={photos[index].url} alt={title} />
      </div>
      {photos.length > 1 ? (
        <div className='mw-rent-thumbs'>
          {photos.map((photo, position) => (
            <button
              key={photo.id}
              type='button'
              className={position === index ? 'active' : ''}
              aria-label={`${bn ? 'ছবি' : 'Photo'} ${position + 1}`}
              aria-current={position === index}
              onClick={() => setActive(position)}
            >
              <img src={photo.url} alt='' loading='lazy' />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
