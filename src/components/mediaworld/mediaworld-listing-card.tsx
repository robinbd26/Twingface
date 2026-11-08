import Link from 'next/link';
import { MEDIA_WORLD_CATEGORY_LABELS, type MediaWorldListing } from '@/lib/mediaworld';

function formatBdt(pricePaisa: number): string {
  return `৳${(pricePaisa / 100).toLocaleString('en-US')}`;
}

export default function MediaWorldListingCard({
  listing,
  viewerId,
}: {
  listing: MediaWorldListing;
  viewerId: string;
}) {
  const own = listing.sellerId === viewerId;
  const profile = listing.seller;
  const cover = listing.images.find((image) => image.url)?.url;

  return (
    <article className="fb-card surface group" data-testid={`listing-${listing.id}`}>
      {cover ? (
        <img src={cover} alt={listing.title} className="h-48 w-full object-cover" />
      ) : null}
      <div className="fb-card-head">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#e4e6eb]">{listing.title}</h3>
            <p className="text-xs text-[#b0b3b8] mt-1">
              {formatBdt(listing.pricePaisa)} · {listing.condition}
            </p>
          </div>
          <span className="rounded-full bg-[#2d88ff]/20 px-2 py-1 text-[10px] font-semibold text-[#2d88ff]">{MEDIA_WORLD_CATEGORY_LABELS[listing.category as keyof typeof MEDIA_WORLD_CATEGORY_LABELS] ?? listing.category}</span>
        </div>
      </div>

      {listing.description ? <p className="mt-2 text-sm text-[#b0b3b8]">{listing.description}</p> : null}

      <div className="flex flex-wrap gap-2 text-xs text-[#b0b3b8]">
        <span className="rounded-full bg-[#2a2c30] px-2 py-1">{listing.location}</span>
        {listing.images.length > 1 ? (
          <span className="rounded-full bg-[#2a2c30] px-2 py-1">{listing.images.length} images</span>
        ) : null}
        <span className="rounded-full bg-[#2a2c30] px-2 py-1">{listing.status}</span>
      </div>

      {profile ? (
        <div className='mt-3 flex items-center gap-3 rounded-xl border border-[#2a2c30] bg-[#1e1f22] p-3'>
          {profile.profileImage ? (
            <img className='h-12 w-12 rounded-full object-cover' src={profile.profileImage} alt='' />
          ) : (
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-[#2d88ff]/20 text-sm font-bold text-[#2d88ff]'>
              {profile.name.trim().charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div className='min-w-0'>
            <p className='text-sm font-semibold text-[#e4e6eb]'>{profile.name}</p>
            {profile.profession ? <p className='truncate text-xs text-[#b0b3b8]'>{profile.profession}</p> : null}
            {profile.bio ? <p className='mt-1 line-clamp-2 text-xs text-[#b0b3b8]'>{profile.bio}</p> : null}
          </div>
        </div>
      ) : (
        <Link className='mt-3 fb-btn fb-btn-outline w-full text-center' href={`/marketplace/${listing.id}`}>Message seller</Link>
      )}

      <div className="mt-3 flex gap-2">
        {own ? (
          <span className="fb-btn fb-btn-ghost flex-1 text-center">Your listing</span>
        ) : (
          <Link className="fb-btn fb-btn-primary flex-1" href={`/marketplace/${listing.id}`}>Message seller</Link>
        )}
        <Link className="fb-btn fb-btn-outline flex-1" href={`/${profile?.username ?? 'placeholder'}`}>View profile</Link>
      </div>
    </article>
  );
}
