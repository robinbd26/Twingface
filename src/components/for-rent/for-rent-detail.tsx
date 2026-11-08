'use client';

import Link from 'next/link';
import { MediaWorldLanguageToggle, useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { formatRentalAvailability, formatRentalPrice, nodeName, text } from '@/lib/mediaworld/labels';
import { rentalSpecRows } from '@/lib/mediaworld/rental-specs';
import type { RentalListingDetailPage } from '@/lib/mediaworld/rental';
import ForRentBooking from './for-rent-booking';
import ForRentGallery from './for-rent-gallery';
import ForRentInquiry from './for-rent-inquiry';
import ForRentReport from './for-rent-report';

type Props = {
  listing: RentalListingDetailPage;
  isOwner: boolean;
  viewer: { name: string; email: string };
};

const LISTING_DATE = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' });

export default function ForRentDetail({ listing, isOwner, viewer }: Props) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const specs = rentalSpecRows(listing);
  const provider = listing.provider;
  const phone = listing.contactPhone;
  const email = listing.contactEmail;
  const closed = !listing.isActive || listing.availability !== 'AVAILABLE';

  return (
    <section className='mw-rent-detail'>
      <div className='mw-rent-detail-bar'>
        <Link href='/for-rent'>{bn ? '← ভাড়া তালিকায় ফিরুন' : '← Back to For Rent'}</Link>
        <div className='mw-rent-links'>
          <Link href='/mediaworld' data-testid='for-rent-back-to-mediaworld'>{bn ? '← মিডিয়া ওয়ার্ল্ড' : '← Media World'}</Link>
          <MediaWorldLanguageToggle />
        </div>
      </div>

      {!listing.isActive ? (
        <p className='mw-rent-closed-banner'>{bn ? 'এই তালিকাটি এখন আর সক্রিয় নয়।' : 'This listing is no longer active.'}</p>
      ) : null}

      <div className='mw-rent-detail-grid'>
        <ForRentGallery title={listing.title} photos={listing.photos} />

        <div className='mw-rent-detail-info'>
          <p className='mw-rent-crumb'>
            {nodeName(listing.category, bn)}
            {listing.subcategory ? ` · ${nodeName(listing.subcategory, bn)}` : ''}
          </p>
          <h1>{listing.title}</h1>
          <p className='mw-rent-price'>{formatRentalPrice(listing.pricePaisa, listing.priceUnit, listing.priceCustom, bn)}</p>
          <p className='mw-rent-meta'>
            <span className={`mw-rent-pill ${listing.availability === 'AVAILABLE' ? 'open' : 'closed'}`}>
              {formatRentalAvailability(listing.availability, bn)}
            </span>
            <span>📍 {listing.location}</span>
            <span>🗓 {LISTING_DATE.format(listing.createdAt)}</span>
          </p>

          <h2>{bn ? 'বিবরণ' : 'Description'}</h2>
          <p className='mw-rent-description'>{listing.description}</p>

          {specs.length ? (
            <>
              <h2>{bn ? 'তথ্য' : 'Details'}</h2>
              <dl className='mw-rent-specs'>
                {specs.map((spec) => (
                  <div key={spec.label.en}>
                    <dt>{text(spec.label, bn)}</dt>
                    <dd>{text(spec.value, bn)}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : null}

          {listing.terms ? (
            <>
              <h2>{bn ? 'শর্তাবলি' : 'Terms'}</h2>
              <p className='mw-rent-description'>{listing.terms}</p>
            </>
          ) : null}
        </div>
      </div>

      <div className='mw-rent-bottom'>
        <aside className='mw-rent-provider-card'>
          <h2>{bn ? 'প্রোভাইডার' : 'Provider'}</h2>
          <div className='mw-rent-provider-head'>
            {provider.logoUrl ? <img src={provider.logoUrl} alt='' /> : <span className='mw-onb-logo-empty'>{bn ? 'লোগো' : 'Logo'}</span>}
            <div>
              <strong>{provider.businessName ?? provider.ownerName}</strong>
              <p>{provider.ownerName}</p>
              <p>📍 {provider.location}</p>
            </div>
          </div>
          <p className='mw-rent-provider-about'>{provider.description}</p>
          <div className='mw-rent-contact'>
            {phone ? <a href={`tel:${phone}`}>📞 {phone}</a> : null}
            {email ? <a href={`mailto:${email}`}>✉ {email}</a> : null}
            {!phone && !email && !isOwner ? (
              <p className='mw-rent-contact-note'>
                {bn
                  ? 'এই ভাড়াদাতা ফোন বা ইমেইল প্রকাশ করেননি — নিচের জিজ্ঞাসা ফর্ম থেকে বার্তা পাঠান।'
                  : 'This provider has not published a phone or email. Send an inquiry from the form instead.'}
              </p>
            ) : null}
          </div>

          {isOwner ? (
            <div className='mw-rent-owner-actions'>
              <Link href={`/for-rent/${listing.id}/edit`}>{bn ? 'তালিকা সম্পাদনা' : 'Edit listing'}</Link>
              <Link href='/for-rent/bookings'>{bn ? 'বুকিং অনুরোধ ও প্রাপ্যতা' : 'Booking requests & availability'}</Link>
              <Link href='/for-rent/dashboard'>{bn ? 'ভাড়া ড্যাশবোর্ড' : 'Rental dashboard'}</Link>
            </div>
          ) : null}
        </aside>

        <div className='mw-rent-aside'>
          {isOwner ? (
            <p className='mw-rent-own-note'>
              {bn
                ? 'এটি আপনার নিজের তালিকা, তাই নিজে জিজ্ঞাসা পাঠানো যায় না। জবাবগুলো “আমার তালিকা” পেজে দেখুন।'
                : 'This is your own listing, so inquiries are disabled. Replies appear on the My listings page.'}
            </p>
          ) : (
            <>
              <ForRentBooking
                listingId={listing.id}
                pricePaisa={listing.pricePaisa}
                priceUnit={listing.priceUnit}
                priceCustom={listing.priceCustom}
                closed={closed}
              />
              <ForRentInquiry
                listingId={listing.id}
                viewerName={viewer.name}
                viewerEmail={viewer.email}
                closed={closed}
              />
            </>
          )}
          {isOwner ? null : <ForRentReport listingId={listing.id} />}
        </div>
      </div>
    </section>
  );
}
