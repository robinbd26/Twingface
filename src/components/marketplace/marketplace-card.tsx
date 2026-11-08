import Link from 'next/link';
import type { SafeMarketplaceListing } from '@/lib/marketplace';

export function formatMarketplacePrice(pricePaisa: number) {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(pricePaisa / 100);
}

export default function MarketplaceCard({ listing }: { listing: SafeMarketplaceListing }) {
  const image = listing.images[0];
  return <article className='marketplace-card'>
    <Link href={`/marketplace/${listing.id}`} className='marketplace-card-image'>{image ? <img src={image.url} alt={listing.title} /> : <span>No image</span>}</Link>
    <div className='marketplace-card-body'>
      <strong>{formatMarketplacePrice(listing.pricePaisa)}</strong>
      <Link href={`/marketplace/${listing.id}`}>{listing.title}</Link>
      <small>{listing.location} · {listing.condition === 'NEW' ? 'New' : 'Used'}</small>
      <span className={`marketplace-status ${listing.status === 'AVAILABLE' ? 'available' : 'sold'}`}>{listing.status === 'AVAILABLE' ? 'Available' : 'Sold out'}</span>
    </div>
  </article>;
}
