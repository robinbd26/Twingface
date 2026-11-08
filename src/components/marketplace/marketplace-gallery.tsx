'use client';

import { useState } from 'react';

export default function MarketplaceGallery({ images, title }: { images: Array<{ id?: string; url: string }>; title: string }) {
  const [active, setActive] = useState(0);
  const image = images[active] ?? images[0];
  if (!image) return <div className='marketplace-gallery marketplace-gallery-empty'>No photo available</div>;
  return <section className='marketplace-gallery' aria-label={`${title} photos`}>
    <img src={image.url} alt={title} />
    {images.length > 1 ? <div className='marketplace-thumbnails'>{images.map((item, index) => <button type='button' key={item.id ?? item.url} onClick={() => setActive(index)} aria-pressed={active === index}><img src={item.url} alt='' /></button>)}</div> : null}
  </section>;
}
