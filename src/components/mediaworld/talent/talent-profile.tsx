'use client';

import { useState } from 'react';
import Link from 'next/link';
import ForRentCard from '@/components/for-rent/for-rent-card';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { nodeName, type LocalizedText } from '@/lib/mediaworld/labels';
import type { TalentProfile } from '@/lib/mediaworld/talent-browse';
import type { TalentProfileHidden, TalentProfileView as TalentProfilePayload } from '@/lib/mediaworld/talent-profile-view';
import { NO_HIDDEN_TALENT_FIELDS } from '@/lib/mediaworld/talent-profile-view';
import type { RentalListingCard } from '@/lib/mediaworld/rental';
import { canReveal, DEFAULT_PRIVACY, formatRate, PRIVACY_TOGGLES, type PrivacyField } from '@/lib/mediaworld/showcase';
import TalentShowcaseGallery from './talent-showcase-gallery';
import SendMessageButton from './send-message-button';
import FollowButton from './follow-button';
import BookingRequestCard from './booking-request-card';
import BookingCalendar, { formatBookingDate } from './booking-calendar';
import MediaWorldLogoutButton from './mediaworld-logout-button';
import type { IconName } from './profile-ui';
import { CardHead, Detail, EmptyState, Icon } from './profile-ui';

const ACCOUNT_TYPE_LABELS = {
  PROFESSIONAL: { bn: 'মিডিয়া প্রফেশনাল', en: 'Media professional' },
  BUSINESS: { bn: 'ব্যবসা / প্রতিষ্ঠান', en: 'Business / Organization' },
  RENTAL: { bn: 'ভাড়া সার্ভিস', en: 'Rental service' },
} satisfies Record<NonNullable<TalentProfile['accountType']>, LocalizedText>;

type Identity = TalentProfile['professionalIdentities'][number];
type IndustryGroup = { industry: Identity['industry']; categories: { category: Identity['mainCategory']; designations: Identity['designation'][] }[] };

/** Identities are the source of truth, so the profile nests designations under their main category and industry. */
function groupIdentities(identities: Identity[]): IndustryGroup[] {
  const groups: IndustryGroup[] = [];
  for (const identity of identities) {
    let group = groups.find((candidate) => candidate.industry.id === identity.industry.id);
    if (!group) {
      group = { industry: identity.industry, categories: [] };
      groups.push(group);
    }
    let category = group.categories.find((candidate) => candidate.category.id === identity.mainCategory.id);
    if (!category) {
      category = { category: identity.mainCategory, designations: [] };
      group.categories.push(category);
    }
    category.designations.push(identity.designation);
  }
  return groups;
}

type SocialName = 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'website';

function SocialIcon({ name }: { name: SocialName }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width='16' height='16' viewBox='0 0 24 24' aria-hidden='true'>
      {name === 'youtube' ? <><rect x='2.5' y='5.5' width='19' height='13' rx='4' {...stroke} /><path d='m10 9.5 5 2.5-5 2.5Z' fill='currentColor' /></> : null}
      {name === 'facebook' ? <path d='M14.5 8.5H17V5.5h-2.5A4 4 0 0 0 10.5 9.5V12H8v3h2.5v6H14v-6h2.7l.8-3H14V9.5a1 1 0 0 1 .5-1Z' {...stroke} /> : null}
      {name === 'instagram' ? <><rect x='3' y='3' width='18' height='18' rx='5' {...stroke} /><circle cx='12' cy='12' r='4' {...stroke} /><circle cx='17.2' cy='6.8' r='1' fill='currentColor' /></> : null}
      {name === 'tiktok' ? <><path d='M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5' {...stroke} /><path d='M14 4.5c.8 2.2 2.6 3.7 5 4' {...stroke} /></> : null}
      {name === 'website' ? <><circle cx='12' cy='12' r='9' {...stroke} /><path d='M3.5 12h17M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z' {...stroke} /></> : null}
    </svg>
  );
}

function Stat({ icon, label, value, hint }: { icon: IconName; label: string; value: string | number; hint?: string }) {
  return (
    <div className='mw-tp-stat'>
      <span className='mw-tp-stat-icon' aria-hidden='true'><Icon name={icon} size={17} /></span>
      <span className='mw-tp-stat-copy'>
        <span className='mw-tp-stat-label'>{label}</span>
        <strong className='mw-tp-stat-value' title={hint}>{value}</strong>
      </span>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  visible,
  shared,
  withheld = false,
  owner,
  href,
  bn,
}: {
  icon: IconName;
  label: string;
  value: string | null | undefined;
  visible: boolean;
  shared: boolean;
  withheld?: boolean;
  owner: boolean;
  href?: string;
  bn: boolean;
}) {
  if (!value && !withheld) return null;
  const showValue = visible && Boolean(value);
  const badge = owner ? (shared ? 'public' : 'private') : (showValue ? null : 'private');
  return (
    <div className='flex items-center gap-3 border-b border-slate-800 py-3 first:pt-0 last:border-0 last:pb-0'>
      <span className='grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-sky-400' aria-hidden='true'>
        <Icon name={icon} size={15} />
      </span>
      <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
        <span className='text-[11px] font-bold uppercase tracking-wide text-slate-500'>{label}</span>
        {showValue ? (
          href ? (
            <a className='block truncate text-[13.5px] font-semibold text-slate-100' href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer nofollow' : undefined}>{value}</a>
          ) : (
            <strong className='block truncate text-[13.5px] font-semibold text-slate-100'>{value}</strong>
          )
        ) : (
          <span className='flex items-center gap-1 text-slate-600' aria-hidden='true'><Icon name='lock' size={12} /> ••••••••</span>
        )}
      </div>
      {badge ? (
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${badge === 'public' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
          <Icon name={badge === 'public' ? 'check' : 'lock'} size={11} />
          {badge === 'public' ? (bn ? 'পাবলিক' : 'Public') : (bn ? 'প্রাইভেট' : 'Private')}
        </span>
      ) : null}
    </div>
  );
}

export default function TalentProfileView({
  profile,
  listings,
  isOwner = false,
  hidden = NO_HIDDEN_TALENT_FIELDS,
  viewerFollows = false,
}: {
  profile: TalentProfilePayload;
  listings: RentalListingCard[];
  isOwner?: boolean;
  hidden?: TalentProfileHidden;
  viewerFollows?: boolean;
}) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bookingPreviewDate, setBookingPreviewDate] = useState('');
  const initial = profile.name.trim().charAt(0).toUpperCase() || 'T';
  const place = [profile.district, profile.division].filter(Boolean).join(', ');
  const groups = groupIdentities(profile.professionalIdentities);
  const organization = profile.organization;
  const provider = profile.rentalProvider;
  const accountLabel = profile.accountType ? ACCOUNT_TYPE_LABELS[profile.accountType][bn ? 'bn' : 'en'] : '';
  const settings = profile.talentSettings;
  const privacy = settings ?? DEFAULT_PRIVACY;
  const reveal = (field: PrivacyField) => canReveal(field, privacy, isOwner);
  const shared = (field: PrivacyField) => privacy[PRIVACY_TOGGLES[field]];

  const socialLinks = settings
    ? ([
        { name: 'youtube' as const, label: 'YouTube', href: settings.youtubeUrl },
        { name: 'facebook' as const, label: 'Facebook', href: settings.facebookUrl },
        { name: 'instagram' as const, label: 'Instagram', href: settings.instagramUrl },
        { name: 'tiktok' as const, label: 'TikTok', href: settings.tiktokUrl },
        { name: 'website' as const, label: bn ? 'ওয়েবসাইট' : 'Website', href: settings.websiteUrl },
      ].filter((link) => Boolean(link.href)))
    : [];

  const whatsappDigits = settings?.whatsapp ? settings.whatsapp.replace(/\D/g, '') : '';
  const rates = [
    { label: bn ? 'প্রতিদিন' : 'Per day', value: settings?.ratePerDay },
    { label: bn ? 'সাপ্তাহিক' : 'Per week', value: settings?.ratePerWeek },
    { label: bn ? 'মাসিক' : 'Per month', value: settings?.ratePerMonth },
  ].filter((rate) => rate.value !== null && rate.value !== undefined);
  const hasContactRows = Boolean(
    profile.phone || profile.email || settings?.whatsapp || profile.presentAddress
    || hidden.phone || hidden.email || hidden.whatsapp || hidden.presentAddress,
  );
  const anyContactHidden = hidden.phone || hidden.email || hidden.whatsapp || hidden.presentAddress;
  const editHref = `/mediaworld/talent/${encodeURIComponent(profile.username)}/edit`;
  const listingPostHref = provider ? '/for-rent/new' : '/for-rent/register';
  const bioIsLong = (profile.bio?.length ?? 0) > 260;
  const skillTags = Array.from(new Set(
    groups.flatMap((group) => group.categories.flatMap((entry) => entry.designations.map((designation) => nodeName(designation, bn)))),
  ));
  const cardClass = 'flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#0f172a]/80 p-5 shadow-sm transition-shadow hover:shadow-md';

  const designationCount = groups.reduce(
    (total, group) => total + group.categories.reduce((sum, entry) => sum + entry.designations.length, 0),
    0,
  );
  const serviceCount = profile.accountType === 'RENTAL' ? listings.length : profile.accountType === 'PROFESSIONAL' ? designationCount : 0;
  const notAdded = bn ? 'এখনও যোগ করা হয়নি' : 'Not added yet';
  const stats = [
    { icon: 'image' as const, label: bn ? 'পোর্টফোলিও আইটেম' : 'Portfolio Items', value: profile.showcaseItems.length || '—', hint: profile.showcaseItems.length ? undefined : notAdded },
    { icon: 'clock' as const, label: bn ? 'অভিজ্ঞতা' : 'Experience', value: '—', hint: notAdded },
    { icon: 'grid' as const, label: bn ? 'সার্ভিস' : 'Services', value: serviceCount || '—', hint: serviceCount ? undefined : notAdded },
    { icon: 'star' as const, label: bn ? 'রিভিউ' : 'Reviews', value: '—', hint: notAdded },
  ];

  return (
    <div className='mw-talent-profile mw-tp mx-auto! w-full max-w-[1440px] px-4 py-6 sm:px-6'>
      <header className='mw-tp-hero'>
        <div className='mw-tp-cover'>
          {profile.coverImage ? (
            <img src={profile.coverImage} alt='' width={1600} height={520} fetchPriority='high' />
          ) : null}
          <span className='mw-tp-cover-line' aria-hidden='true'>
            {bn ? 'ভালো গল্পের পেছনে থাকে ভালো মানুষ' : 'Great stories need great people'}
          </span>
        </div>
        <div className='mw-tp-identity'>
          <div className='mw-tp-avatar-wrap'>
            {profile.profileImage ? (
              <img className='mw-tp-avatar' src={profile.profileImage} alt='' width={112} height={112} fetchPriority='high' />
            ) : (
              <span className='mw-tp-avatar mw-talent-avatar-fallback' aria-hidden='true'>{initial}</span>
            )}
            {profile.accountType ? (
              <span className='mw-tp-verified' role='img' aria-label={bn ? `${accountLabel} অ্যাকাউন্ট` : `${accountLabel} account`}>
                <Icon name='check' size={13} />
              </span>
            ) : null}
          </div>
          <div className='mw-tp-who'>
            <h1>{profile.name}</h1>
            <p className='mw-tp-handle' translate='no'>@{profile.username}</p>
            {place ? (
              <p className='mw-tp-place'>
                <Icon name='pin' size={13} /> {place}{bn ? ', বাংলাদেশ' : ', Bangladesh'}
              </p>
            ) : null}
            {accountLabel ? <span className='mw-tp-account'>{accountLabel}</span> : null}
          </div>
          <div className='mw-tp-actions'>
            {isOwner ? (
              <>
                <Link className='mw-btn mw-btn-secondary' href='/mediaworld' data-testid='talent-profile-mediaworld'>
                  {bn ? 'মিডিয়া ওয়ার্ল্ড' : 'Media World'}
                </Link>
                <MediaWorldLogoutButton />
                <Link className='mw-btn mw-btn-primary' href={editHref}>{bn ? 'প্রোফাইল সম্পাদনা' : 'Edit profile'}</Link>
                {profile.accountType === 'RENTAL' ? (
                  <Link className='mw-btn mw-btn-accent' href={listingPostHref} data-testid='rental-post-listing'>
                    <Icon name='box' size={15} /> {bn ? 'পণ্য / সার্ভিস পোস্ট করুন' : 'Post product / service'}
                  </Link>
                ) : null}
              </>
            ) : (
              <>
                <FollowButton username={profile.username} initiallyFollowing={viewerFollows} />
                <SendMessageButton username={profile.username} variant='secondary' label={bn ? 'মেসেজ' : 'Message'} />
                <a className='mw-btn mw-btn-accent' href='#booking'>
                  <Icon name='calendar' size={15} /> {bn ? 'বুক করুন / সার্ভিস চান' : 'Book / Request Service'}
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      <section className='mw-tp-stats' aria-label={bn ? 'প্রোফাইল সারসংক্ষেপ' : 'Profile highlights'}>
        {stats.map((stat) => (
          <Stat key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} hint={stat.hint} />
        ))}
      </section>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        <div className='flex min-w-0 flex-col gap-6 lg:col-span-2'>
          <section id='about' className={`${cardClass} mw-talent-about-card`}>
            <CardHead
              icon='user'
              title={bn ? 'আমার সম্পর্কে' : 'About Me'}
              action={isOwner && profile.bio ? <Link href={`${editHref}#about`}>{bn ? 'বায়ো সম্পাদনা' : 'Edit Bio'}</Link> : null}
            />
            {profile.bio ? (
              <>
                <p id='mw-tp-about-bio' className={`mw-talent-profile-desc mw-tp-about${bioIsLong && !bioExpanded ? ' is-clamped' : ''}`}>{profile.bio}</p>
                {bioIsLong ? (
                  <button
                    type='button'
                    className='mw-tp-readmore'
                    aria-expanded={bioExpanded}
                    aria-controls='mw-tp-about-bio'
                    onClick={() => setBioExpanded((current) => !current)}
                  >
                    {bioExpanded ? (bn ? 'কম দেখুন' : 'Read less') : (bn ? 'আরও পড়ুন' : 'Read More')}
                    <span className={`mw-tp-readmore-icon${bioExpanded ? ' is-open' : ''}`} aria-hidden='true'><Icon name='chevron' size={12} /></span>
                  </button>
                ) : null}
              </>
            ) : (
              <div className='mw-talent-about-empty'>
                <p>
                  {isOwner
                    ? (bn ? 'কাস্টিং ডিরেক্টরদের জন্য নিজের অভিজ্ঞতা ও দক্ষতা সংক্ষেপে লিখুন।' : 'Introduce yourself to casting directors with a short bio.')
                    : (bn ? 'এই প্রোফাইলে এখনও “আমার সম্পর্কে” যোগ করা হয়নি।' : 'This professional has not added an About Me yet.')}
                </p>
                {isOwner ? (
                  <Link className='mw-talent-about-add' href={`${editHref}#about`}>{bn ? 'বায়ো যোগ করুন' : 'Add Bio'}</Link>
                ) : null}
              </div>
            )}
          </section>

          {organization ? (
            <section className={cardClass}>
              <CardHead icon='briefcase' title={bn ? 'প্রতিষ্ঠান' : 'Organization'} />
              <div className='mw-talent-profile-org'>
                {organization.logoUrl ? (
                  <img className='mw-talent-profile-logo' src={organization.logoUrl} alt='' width={78} height={78} loading='lazy' />
                ) : null}
                <div className='mw-talent-profile-facts'>
                  <Detail label={bn ? 'নাম' : 'Name'} value={organization.orgName} />
                  <Detail label={bn ? 'ধরন' : 'Type'} value={nodeName(organization.orgType, bn)} />
                  <Detail label={bn ? 'সংযোগকর্তা' : 'Contact person'} value={organization.contactName} />
                  {organization.city ? <Detail label={bn ? 'শহর' : 'City'} value={organization.city} /> : null}
                  {organization.address ? <Detail label={bn ? 'ঠিকানা' : 'Address'} value={organization.address} /> : null}
                  {organization.phone ? <Detail label={bn ? 'ফোন' : 'Phone'} value={organization.phone} /> : null}
                  {organization.email ? <Detail label='Email' value={organization.email} /> : null}
                </div>
              </div>
              {organization.description ? <p className='mw-talent-profile-desc'>{organization.description}</p> : null}
              {organization.website ? (
                <a className='mw-talent-profile-link' href={organization.website} target='_blank' rel='noopener noreferrer'>
                  {organization.website}
                </a>
              ) : null}
            </section>
          ) : null}

          {provider ? (
            <section className={cardClass}>
              <CardHead icon='briefcase' title={bn ? 'ভাড়ার সেবা' : 'Rental provider'} />
              <div className='mw-talent-profile-org'>
                {provider.logoUrl ? <img className='mw-talent-profile-logo' src={provider.logoUrl} alt='' width={78} height={78} loading='lazy' /> : null}
                <div className='mw-talent-profile-facts'>
                  <Detail label={bn ? 'প্রতিষ্ঠানের নাম' : 'Business name'} value={provider.businessName ?? provider.ownerName} />
                  <Detail label={bn ? 'মালিক' : 'Owner'} value={provider.ownerName} />
                  <Detail label={bn ? 'এলাকা' : 'Location'} value={provider.location} />
                  {provider.fullAddress ? <Detail label={bn ? 'ঠিকানা' : 'Address'} value={provider.fullAddress} /> : null}
                  {provider.phone ? <Detail label={bn ? 'ফোন' : 'Phone'} value={provider.phone} /> : null}
                  {provider.email ? <Detail label='Email' value={provider.email} /> : null}
                </div>
              </div>
              <p className='mw-talent-profile-desc'>{provider.description}</p>
            </section>
          ) : null}

          <section className={cardClass}>
            <CardHead
              icon='image'
              title={bn ? 'পোর্টফোলিও শোকেস' : 'Portfolio Showcase'}
              action={isOwner ? <Link href={`${editHref}#portfolio`}>{bn ? 'ম্যানেজ করুন' : 'Manage portfolio'}</Link> : null}
            />
            {profile.showcaseItems.length ? (
              <TalentShowcaseGallery items={profile.showcaseItems} />
            ) : (
              <p className='mw-talent-muted'>
                {isOwner
                  ? (bn ? 'আপনার সেরা কাজ যোগ করুন — ১০টি ছবি ও ৫টি ভিডিও লিঙ্ক পর্যন্ত।' : 'Add your best work — up to 10 photos and 5 video links.')
                  : (bn ? 'এই প্রোফাইলে এখনও পোর্টফোলিও যোগ করা হয়নি।' : 'This profile has not added portfolio media yet.')}
              </p>
            )}
          </section>

          <section className={cardClass}>
            <CardHead icon='briefcase' title={bn ? 'অভিজ্ঞতা ও দক্ষতা' : 'Experience & Skills'} />
            {skillTags.length ? (
              <div className='flex flex-col gap-2'>
                <span className='text-[11px] font-bold uppercase tracking-wide text-slate-500'>{bn ? 'দক্ষতা' : 'Skills'}</span>
                <div className='flex flex-wrap gap-2'>
                  {skillTags.map((tag) => (
                    <span key={tag} className='rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300'>{tag}</span>
                  ))}
                </div>
              </div>
            ) : null}
            <EmptyState
              icon='briefcase'
              title={bn ? 'এখনও অভিজ্ঞতা যোগ করা হয়নি' : 'No experience added yet'}
              body={bn
                ? 'এই প্রোফাইলে এখনও কাজের ইতিহাস দেওয়া হয়নি।'
                : 'This profile does not list work history yet.'}
            />
          </section>

          <section className={cardClass}>
            <CardHead icon='star' title={bn ? 'রিভিউ ও রেটিং' : 'Reviews & Ratings'} />
            <EmptyState
              icon='star'
              title={bn ? 'এখনও কোনো রিভিউ নেই' : 'No reviews yet'}
              body={bn
                ? 'এই প্রোফাইলে এখনও কোনো রিভিউ যোগ হয়নি।'
                : 'This profile has not received any reviews yet.'}
            />
          </section>
        </div>

        <aside className='flex min-w-0 flex-col gap-6 lg:col-span-1'>
          {isOwner ? (
            <section id='booking' className={cardClass}>
              <CardHead
                icon='calendar'
                title={bn ? 'বুকিং / সময়সূচি' : 'Booking / Availability'}
                action={(
                  <span className='self-center'>
                    <BookingCalendar
                      variant='icon'
                      value={bookingPreviewDate}
                      onChange={setBookingPreviewDate}
                      bn={bn}
                      label={bn ? 'বুকিং ক্যালেন্ডার খুলুন' : 'Open booking calendar'}
                    />
                  </span>
                )}
              />
              <p className='text-sm leading-relaxed text-slate-400'>
                {bn
                  ? 'ভিজিটররা এখান থেকে তারিখ ও প্রজেক্টের ধরনসহ বুকিং রিকোয়েস্ট পাঠাতে পারবে।'
                  : 'Visitors can send a booking request with their preferred date and project type.'}
              </p>
              <div className='flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5'>
                <span className='h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400' aria-hidden='true' />
                <span className='text-xs font-semibold text-emerald-300'>{bn ? 'বুকিং রিকোয়েস্ট গ্রহণ করা হচ্ছে' : 'Booking requests open'}</span>
              </div>
              {bookingPreviewDate ? (
                <p className='text-xs font-semibold text-slate-400'>
                  {bn ? 'নির্বাচিত তারিখ' : 'Selected date'}
                  {' '}
                  <span className='text-slate-100'>{formatBookingDate(bookingPreviewDate, bn)}</span>
                </p>
              ) : null}
              <Link className='mw-btn mw-btn-outline mw-btn-block' href='/messages'>{bn ? 'মেসেজ দেখুন' : 'Open messages'}</Link>
            </section>
          ) : (
            <BookingRequestCard username={profile.username} name={profile.name} />
          )}

          <section className={cardClass}>
            <CardHead icon='phone' title={bn ? 'যোগাযোগের তথ্য' : 'Contact Information'} />
            {hasContactRows ? (
              <div className='flex flex-col'>
                <ContactRow
                  icon='phone'
                  label={bn ? 'ফোন' : 'Phone'}
                  value={profile.phone}
                  visible={reveal('phone')}
                  shared={shared('phone')}
                  withheld={hidden.phone}
                  owner={isOwner}
                  href={profile.phone ? `tel:${profile.phone}` : undefined}
                  bn={bn}
                />
                <ContactRow
                  icon='mail'
                  label='Email'
                  value={profile.email}
                  visible={reveal('email')}
                  shared={shared('email')}
                  withheld={hidden.email}
                  owner={isOwner}
                  href={profile.email ? `mailto:${profile.email}` : undefined}
                  bn={bn}
                />
                <ContactRow
                  icon='phone'
                  label='WhatsApp'
                  value={settings?.whatsapp}
                  visible={reveal('whatsapp')}
                  shared={shared('whatsapp')}
                  withheld={hidden.whatsapp}
                  owner={isOwner}
                  href={whatsappDigits ? `https://wa.me/${whatsappDigits}` : undefined}
                  bn={bn}
                />
                <ContactRow
                  icon='pin'
                  label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'}
                  value={profile.presentAddress}
                  visible={reveal('address')}
                  shared={shared('address')}
                  withheld={hidden.presentAddress}
                  owner={isOwner}
                  bn={bn}
                />
              </div>
            ) : (
              <p className='mw-talent-muted'>
                {isOwner
                  ? (bn ? 'প্রোফাইল সম্পাদনা করে যোগাযোগের তথ্য যোগ করুন।' : 'Add contact details from the profile editor.')
                  : (bn ? 'এই প্রোফাইলে যোগাযোগের তথ্য দেওয়া হয়নি।' : 'This profile has not shared contact details.')}
              </p>
            )}
            {!isOwner && anyContactHidden ? (
              <p className='mw-talent-muted'>
                {bn ? 'কিছু তথ্য প্রাইভেট রাখা হয়েছে — সরাসরি মেসেজ করুন।' : 'Some details are private — message this professional directly.'}
              </p>
            ) : null}
          </section>

          {profile.accountType === 'PROFESSIONAL' ? (
            <section className={cardClass}>
              <CardHead icon='film' title={bn ? 'পেশাগত পরিচয়' : 'Professional Identities'} />
              {groups.length ? (
                groups.map((group) => (
                  <div key={group.industry.id} className='mw-tp-identity-group'>
                    <h3>{nodeName(group.industry, bn)}</h3>
                    {group.categories.map((entry) => (
                      <div key={entry.category.id} className='mw-tp-identity-row'>
                        <span className='mw-tp-identity-cat'>{nodeName(entry.category, bn)}</span>
                        <div className='mw-talent-chips'>
                          {entry.designations.map((designation) => (
                            <span key={designation.id}>{nodeName(designation, bn)}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <p className='mw-talent-muted'>
                  {bn ? 'এই প্রোফাইলে এখনও কোনো পেশা যোগ করা হয়নি।' : 'No professional identities have been added yet.'}
                </p>
              )}
            </section>
          ) : null}

          <section className={cardClass}>
            <CardHead
              icon='wallet'
              title={bn ? 'রেট কার্ড' : 'Rate Card'}
              action={isOwner && rates.length ? <Link href={`${editHref}#rates`}>{bn ? 'রেট সম্পাদনা' : 'Edit rates'}</Link> : null}
            />
            {rates.length ? (
              <div className='grid grid-cols-3 gap-2.5'>
                {rates.map((rate) => (
                  <div key={rate.label} className='mw-rate-item'>
                    <span>{rate.label}</span>
                    <strong className='whitespace-nowrap text-sm!'>{formatRate(rate.value, settings?.currency)}</strong>
                  </div>
                ))}
              </div>
            ) : hidden.rates ? (
              <p className='mw-talent-muted'>
                <span className='mw-tp-inline-icon' aria-hidden='true'><Icon name='lock' size={12} /></span>{' '}
                {bn ? 'রেট কার্ড প্রাইভেট — সরাসরি মেসেজ করুন।' : 'This rate card is private — message this professional directly.'}
              </p>
            ) : (
              <p className='mw-talent-muted'>
                {bn ? 'এখনও কোনো রেট কার্ড যোগ করা হয়নি।' : 'No rate card has been added yet.'}
              </p>
            )}
            {!isOwner ? (
              <a className='mw-btn mw-btn-outline mw-btn-block' href='#booking'>+ {bn ? 'রেট জানতে যোগাযোগ করুন' : 'Add / Contact for Rates'}</a>
            ) : !rates.length ? (
              <Link className='mw-btn mw-btn-outline mw-btn-block' href={`${editHref}#rates`}>+ {bn ? 'রেট যোগ করুন' : 'Add rates'}</Link>
            ) : null}
            {isOwner && rates.length && !privacy.showRates ? (
              <p className='mw-talent-muted'>{bn ? 'রেট কার্ড এখন প্রাইভেট — শুধু আপনি দেখছেন।' : 'Your rate card is private — only you can see it.'}</p>
            ) : null}
          </section>

          <section className={cardClass}>
            <CardHead
              icon='share'
              title={bn ? 'সোশ্যাল লিঙ্ক' : 'Social Links'}
              action={isOwner ? <Link href={`${editHref}#rates`}>{bn ? 'সম্পাদনা' : 'Edit'}</Link> : null}
            />
            {socialLinks.length ? (
              <div className='flex flex-wrap gap-2.5 text-slate-300'>
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    className='inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 transition-colors hover:border-violet-500 hover:bg-violet-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400'
                    href={link.href!}
                    target='_blank'
                    rel='noopener noreferrer nofollow'
                    aria-label={link.label}
                    title={link.label}
                  >
                    <SocialIcon name={link.name} />
                  </a>
                ))}
              </div>
            ) : (
              <p className='mw-talent-muted'>
                {isOwner
                  ? (bn ? 'প্রোফাইল সম্পাদনা করে সোশ্যাল লিঙ্ক যোগ করুন।' : 'Add your social links from the profile editor.')
                  : (bn ? 'এই প্রোফাইলে সোশ্যাল লিঙ্ক যোগ করা হয়নি।' : 'This profile has not added social links yet.')}
              </p>
            )}
          </section>
        </aside>
      </div>

      {profile.accountType === 'RENTAL' ? (
        <section className={cardClass}>
          <CardHead
            icon='box'
            title={bn ? 'ভাড়ার পণ্য ও সার্ভিস' : 'Rental products & services'}
            action={(
              <span className='mw-tp-head-links'>
                {isOwner ? <Link href={listingPostHref} data-testid='rental-post-listing-card'>+ {bn ? 'পোস্ট করুন' : 'Post'}</Link> : null}
                <Link href='/for-rent'>{bn ? 'সব ভাড়া দেখুন' : 'Browse all rentals'}</Link>
              </span>
            )}
          />
          {listings.length ? (
            <div className='mw-rent-grid'>
              {listings.map((listing) => <ForRentCard key={listing.id} listing={listing} />)}
            </div>
          ) : (
            <>
              <EmptyState
                icon='box'
                title={isOwner
                  ? (bn ? 'আপনার এখনো কোনো ভাড়ার পণ্য পোস্ট করা নেই' : 'You have not posted a rental item yet')
                  : (bn ? 'এই প্রদানকারীর কোনো সক্রিয় ভাড়ার পণ্য নেই' : 'This provider has no active rental listings right now')}
                body={isOwner
                  ? (provider
                    ? (bn
                      ? 'গাড়ি, বাইক, লাইট, সাউন্ড সিস্টেম, প্রপ, ড্রোন বা শুটিং হাউস — যা ভাড়া দেন একটি করে পোস্ট করুন। প্রতিটি আইটেম এখানে এবং For Rent বাজারে তার লোকেশনসহ দেখাবে।'
                      : 'Post one item per thing you rent out — car, bike, light, sound system, props, drone or shooting house. Each one shows up here and in the For Rent marketplace with its own location.')
                    : (bn
                      ? 'আগে ভাড়ার প্রোভাইডার প্রোফাইলটি সম্পূর্ণ করুন; এরপরই আপনি পণ্য পোস্ট করতে পারবেন।'
                      : 'Complete the rental provider profile first — then you can post products.'))
                  : (bn
                    ? 'এই মুহূর্তে এই প্রোফাইলে দেখানোর মতো কোনো সক্রিয় ভাড়ার পণ্য নেই।'
                    : 'Nothing is live on this profile at the moment.')}
              />
              {isOwner ? (
                <Link className='mw-btn mw-btn-outline mw-btn-block' href={listingPostHref} data-testid='rental-post-listing-empty'>
                  <Icon name='box' size={15} /> {provider
                    ? (bn ? 'পণ্য / সার্ভিস পোস্ট করুন' : 'Post product / service')
                    : (bn ? 'প্রোভাইডার সেটআপ সম্পূর্ণ করুন' : 'Complete provider setup')}
                </Link>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
