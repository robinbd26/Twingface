'use client';

import { useState } from 'react';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import type { IdentityView, OnboardingState, OrganizationView, ProviderView } from '@/lib/mediaworld/onboarding';
import type { TaxonomySnapshot } from '@/lib/mediaworld/taxonomy';
import type { MediaAccountTypeInput } from '@/lib/mediaworld/validations';
import { FormAlert } from '@/components/ui/form-field';
import { NETWORK_ERROR, postJson, readError } from '@/lib/client/forms';
import ProfessionalStep from './professional-step';
import BusinessStep from './business-step';
import RentalStep from './rental-step';

const ACCOUNT_TYPES: { value: MediaAccountTypeInput; icon: string; title: { bn: string; en: string }; copy: { bn: string; en: string } }[] = [
  {
    value: 'PROFESSIONAL',
    icon: '🎬',
    title: { bn: 'মিডিয়া প্রফেশনাল', en: 'Media Professional' },
    copy: { bn: 'দর্শক, অভিনেতা, ক্রু ও সঙ্গীতশিল্পী — ইন্ডাস্ট্রি, ক্যাটাগরি ও পদ বেছে নিজের প্রোফাইল সাজান।', en: 'Director, actor, crew or musician — build a profile from industry, category and designation.' },
  },
  {
    value: 'BUSINESS',
    icon: '🏢',
    title: { bn: 'ব্যবসা / প্রতিষ্ঠান', en: 'Business / Organization' },
    copy: { bn: 'প্রোডাকশন হাউস, এজেন্সি বা স্টুডিও — প্রতিষ্ঠানের নাম, ধরন ও যোগাযোগের তথ্য রাখুন।', en: 'Production house, agency or studio — keep organization type, contact and portfolio details.' },
  },
  {
    value: 'RENTAL',
    icon: '🚐',
    title: { bn: 'ফর রেন্ট / ভাড়ার সার্ভিস', en: 'For Rent / Rental Service' },
    copy: { bn: 'গাড়ি, শ্যুটিং হাউস, ক্যামেরা, লাইট, সাউন্ড ইকুইপমেন্ট — একাধিক রেন্টাল লিস্টিং দিন।', en: 'Vehicles, shooting houses, cameras, lighting and sound — publish multiple rental listings.' },
  },
];

const ACCOUNT_TYPE_LABEL: Record<MediaAccountTypeInput, { bn: string; en: string }> = {
  PROFESSIONAL: { bn: 'মিডিয়া প্রফেশনাল', en: 'Media Professional' },
  BUSINESS: { bn: 'ব্যবসা / প্রতিষ্ঠান', en: 'Business / Organization' },
  RENTAL: { bn: 'ফর রেন্ট', en: 'For Rent' },
};

const CHOOSE_ERROR = { bn: 'অ্যাকাউন্ট টাইপ নির্ধারণ করা যায়নি।', en: 'Unable to choose the account type.' };

export default function OnboardingWizard({
  taxonomy,
  state,
  userName,
}: {
  taxonomy: TaxonomySnapshot;
  state: OnboardingState;
  userName: string;
}) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';

  const [accountType, setAccountType] = useState<MediaAccountTypeInput | null>(
    state.accountType ? (state.accountType as MediaAccountTypeInput) : null,
  );
  const [identities, setIdentities] = useState<IdentityView[]>(state.identities);
  const [organization, setOrganization] = useState<OrganizationView | null>(state.organization);
  const [provider, setProvider] = useState<ProviderView | null>(state.provider);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  async function chooseAccountType(value: MediaAccountTypeInput) {
    setBusy(true);
    setMessage(null);
    const { ok, status, json } = await postJson('/api/mediaworld/account-type', { accountType: value });
    setBusy(false);

    const returned = (json as { accountType?: MediaAccountTypeInput | null } | null)?.accountType ?? null;
    if (status === 409 && returned) {
      setAccountType(returned);
      setMessage({
        tone: 'error',
        text: bn
          ? `আপনার অ্যাকাউন্ট ইতিমধ্যেই ${ACCOUNT_TYPE_LABEL[returned].bn} হিসেবে সেট আছে। পরিবর্তনের জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।`
          : `This account is already set up as ${ACCOUNT_TYPE_LABEL[returned].en}. Ask an admin to change it.`,
      });
      return;
    }
    if (!ok) {
      setMessage({
        tone: 'error',
        text: status === 0 ? (bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en) : readError(json, CHOOSE_ERROR, bn),
      });
      return;
    }
    setAccountType(value);
  }

  const chosen = accountType ? ACCOUNT_TYPE_LABEL[accountType] : null;

  return (
    <div className='mw-onb'>
      <header className='mw-onb-head'>
        <div>
          <h1>{bn ? 'মিডিয়া ওয়ার্ল্ড প্রোফাইল সেটআপ' : 'Media World profile setup'}</h1>
          <p className='mw-onb-lead'>
            {userName ? `${userName}, ` : ''}
            {accountType
              ? (bn ? 'নিচের ফর্মে আপনার প্রোফাইল সম্পূর্ণ করুন।' : 'complete your profile below.')
              : (bn ? 'অ্যাকাউন্ট টাইপ বেছে নিয়ে আপনার প্রোফাইল সম্পূর্ণ করুন।' : 'choose an account type and complete your profile.')}
          </p>
        </div>
        {chosen ? (
          <span className='mw-onb-badge'>{bn ? chosen.bn : chosen.en}</span>
        ) : null}
      </header>

      {message ? <FormAlert message={message.text} tone={message.tone} /> : null}

      {!accountType ? (
        <div className='mw-onb-types'>
          {ACCOUNT_TYPES.map((type) => (
            <button
              key={type.value}
              type='button'
              className='mw-onb-type'
              disabled={busy}
              onClick={() => chooseAccountType(type.value)}
            >
              <span aria-hidden='true'>{type.icon}</span>
              <strong>{bn ? type.title.bn : type.title.en}</strong>
              <p>{bn ? type.copy.bn : type.copy.en}</p>
              <em>{bn ? 'বেছে নিন' : 'Choose'}</em>
            </button>
          ))}
        </div>
      ) : accountType === 'PROFESSIONAL' ? (
        <>
          <ProfessionalStep taxonomy={taxonomy} identities={identities} onChange={setIdentities} />
          <p className='mw-onb-note'>
            {bn
              ? 'যোগ করা পেশা যেকোনো সময় সরানো যাবে; প্রতিটি পেশা আলাদাভাবে ইন্ডাস্ট্রি, ক্যাটাগরি ও পদ হিসেবে সংরক্ষিত হয়।'
              : 'Each identity is stored on its own as industry + main category + designation, and can be removed any time.'}
          </p>
        </>
      ) : accountType === 'BUSINESS' ? (
        <BusinessStep taxonomy={taxonomy} organization={organization} onSaved={setOrganization} />
      ) : (
        <RentalStep taxonomy={taxonomy} provider={provider} onSaved={setProvider} />
      )}

      {accountType ? (
        <footer className='mw-onb-foot'>
          <span className='mw-onb-muted'>
            {bn
              ? `অ্যাকাউন্ট টাইপ একবারই নির্ধারণ করা যায় — বর্তমান: ${chosen ? chosen.bn : ''}।`
              : `The account type is set once and cannot be changed from this page.`}
          </span>
        </footer>
      ) : null}
    </div>
  );
}
