'use client';

import Link from 'next/link';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { nodeName, type LocalizedText } from '@/lib/mediaworld/labels';
import type { TalentRow } from '@/lib/mediaworld/talent-browse';

const ACCOUNT_TYPE_LABELS = {
  PROFESSIONAL: { bn: 'মিডিয়া প্রফেশনাল', en: 'Media professional' },
  BUSINESS: { bn: 'ব্যবসা / প্রতিষ্ঠান', en: 'Business' },
  RENTAL: { bn: 'ভাড়া সার্ভিস', en: 'Rental service' },
} satisfies Record<NonNullable<TalentRow['accountType']>, LocalizedText>;

/** The public landing selects fewer columns than the signed-in browse, so the org/provider blocks are optional. */
type TalentCardData = Omit<TalentRow, 'organization' | 'rentalProvider'> &
  Partial<Pick<TalentRow, 'organization' | 'rentalProvider'>>;

export default function TalentCard({ talent }: { talent: TalentCardData }) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const initial = talent.name.trim().charAt(0).toUpperCase() || 'T';
  const place = [talent.district, talent.division].filter(Boolean).join(' · ');
  const href = `/mediaworld/talent/${talent.username}`;
  const provider = talent.rentalProvider;
  const chips = talent.professionalIdentities.map(
    (identity) =>
      `${nodeName(identity.industry, bn)} · ${nodeName(identity.mainCategory, bn)} · ${nodeName(identity.designation, bn)}`,
  );

  return (
    <article className='mw-talent-card'>
      <header className='mw-talent-card-head'>
        {talent.profileImage ? (
          <img className='mw-talent-avatar' src={talent.profileImage} alt='' loading='lazy' />
        ) : (
          <span className='mw-talent-avatar mw-talent-avatar-fallback' aria-hidden='true'>{initial}</span>
        )}
        <div className='mw-talent-card-id'>
          <Link className='mw-talent-card-name' href={href}>{talent.name}</Link>
          <p className='mw-talent-card-handle'>@{talent.username}</p>
        </div>
        {talent.accountType ? (
          <span className='mw-talent-card-type'>{ACCOUNT_TYPE_LABELS[talent.accountType][bn ? 'bn' : 'en']}</span>
        ) : null}
      </header>

      {place ? <p className='mw-talent-card-place'>📍 {place}</p> : null}
      {talent.bio ? <p className='mw-talent-card-bio'>{talent.bio}</p> : null}

      {chips.length ? (
        <div className='mw-talent-chips'>
          {chips.map((chip) => <span key={chip}>{chip}</span>)}
        </div>
      ) : null}

      {talent.organization ? (
        <p className='mw-talent-card-org'>
          🏢 {talent.organization.orgName}
          <em> · {nodeName(talent.organization.orgType, bn)}</em>
        </p>
      ) : null}

      {provider ? (
        <Link className='mw-talent-card-listings' href={href}>
          {provider.businessName ?? provider.ownerName}
          <em>{bn ? ' — ভাড়ার পণ্য দেখুন' : ' — view rental listings'}</em>
        </Link>
      ) : null}
    </article>
  );
}
