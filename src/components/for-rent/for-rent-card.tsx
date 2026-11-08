'use client';

import Link from 'next/link';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { formatRentalAvailability, formatRentalPrice, nodeName } from '@/lib/mediaworld/labels';
import type { RentalListingCard } from '@/lib/mediaworld/rental';

export default function ForRentCard({ listing }: { listing: RentalListingCard }) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const photo = listing.photos[0];
  const provider = listing.provider.businessName ?? listing.provider.ownerName;

  return (
    <article className='mw-rent-card'>
      <Link className='mw-rent-card-media' href={`/for-rent/${listing.id}`}>
        {photo ? <img src={photo.url} alt={listing.title} loading='lazy' /> : <span>{bn ? 'ছবি নেই' : 'No photo'}</span>}
        <em className={`mw-rent-card-state ${listing.availability === 'AVAILABLE' ? 'open' : 'closed'}`}>
          {formatRentalAvailability(listing.availability, bn)}
        </em>
      </Link>
      <div className='mw-rent-card-body'>
        <strong>{formatRentalPrice(listing.pricePaisa, listing.priceUnit, listing.priceCustom, bn)}</strong>
        <Link className='mw-rent-card-title' href={`/for-rent/${listing.id}`}>
          {listing.title}
        </Link>
        <p className='mw-rent-card-meta'>
          {nodeName(listing.category, bn)}
          {listing.subcategory ? ` · ${nodeName(listing.subcategory, bn)}` : ''}
        </p>
        <p className='mw-rent-card-place'>📍 {listing.location}</p>
        <p className='mw-rent-card-provider'>{provider}</p>
      </div>
    </article>
  );
}
