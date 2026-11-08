'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import ProfileMediaUploader from '@/components/profile/profile-media-uploader';
import ProfessionalStep from '@/components/mediaworld/onboarding/professional-step';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { FormAlert } from '@/components/ui/form-field';
import { districtsForDivision, DIVISIONS } from '@/lib/constants';
import { DEFAULT_PRIVACY, MAX_TALENT_RATE } from '@/lib/mediaworld/showcase';
import type { IdentityView } from '@/lib/mediaworld/onboarding';
import type { TalentProfile } from '@/lib/mediaworld/talent-browse';
import type { TaxonomySnapshot } from '@/lib/mediaworld/taxonomy';
import type { Profile } from '@/lib/profile';
import ShowcaseManager from './showcase-manager';
import {
  ERROR_STYLE,
  INPUT_CLASS,
  LABEL_STYLE,
  NETWORK_ERROR,
  errorText,
  readError,
  readFieldErrors,
  sendJson,
} from '@/lib/client/forms';

type RateKey = 'ratePerDay' | 'ratePerWeek' | 'ratePerMonth';
type PrivacyKey = 'showPhone' | 'showEmail' | 'showAddress' | 'showWhatsapp' | 'showRates';

const RATE_KEYS: RateKey[] = ['ratePerDay', 'ratePerWeek', 'ratePerMonth'];

const DETAIL_FIELD_IDS: Record<string, string> = {
  bio: 'mw-editor-bio',
  division: 'mw-editor-division',
  district: 'mw-editor-district',
  presentAddress: 'mw-editor-present',
};

const TEXT = {
  en: {
    title: 'Edit your Media World profile',
    lead: 'Update your photos, bio, location, professions, portfolio, links and privacy. Each section saves on its own.',
    back: '← Back to profile',
    viewPublic: 'View public profile',
    mediaTitle: 'Profile photo & cover',
    mediaLead: 'Your profile photo appears on cards, messages and listings. The cover sits behind your name on your public profile.',
    noCover: 'No cover image yet',
    mediaHint: 'JPEG, PNG, WebP or GIF · up to 5 MB.',
    aboutTitle: 'About & location',
    aboutLead: 'Your bio and location help clients find you in Find Talent.',
    bio: 'Bio',
    bioCount: (used: number) => `${used} / 500 characters`,
    division: 'Division',
    district: 'District (Zila)',
    selectDivision: 'Select division',
    selectDistrict: 'Select district',
    selectDistrictFirst: 'Select a division first',
    presentAddress: 'Present address',
    addressPlaceholder: 'House, road, area, upazila…',
    saveDetails: 'Save details',
    saving: 'Saving…',
    detailsSaved: 'Profile details saved.',
    detailsError: 'Unable to save your profile details.',
    professionsTitle: 'Professional identities',
    linksTitle: 'Social & professional links',
    linksLead: 'Add the public pages where clients can see your work. Badges with icons appear on your profile.',
    youtube: 'YouTube',
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    website: 'Personal website',
    ratesTitle: 'Rate card (BDT)',
    ratesLead: 'Leave a field empty to hide that rate. Visitors see your rates only when “Show rates” is on.',
    perDay: 'Per day',
    perWeek: 'Per week',
    perMonth: 'Per month',
    privacyTitle: 'Contact privacy',
    privacyLead: 'Choose what visitors can see. Private values are never sent to their browser.',
    showPhone: 'Show phone number publicly',
    showEmail: 'Show email publicly',
    showAddress: 'Show addresses publicly',
    showWhatsapp: 'Show WhatsApp publicly',
    showRates: 'Show rates publicly',
    whatsapp: 'WhatsApp number',
    whatsappHint: 'Bangladeshi mobile, e.g. 017XXXXXXXX.',
    registered: 'Registered contact',
    registeredPhone: 'Phone',
    registeredEmail: 'Email',
    notSet: 'Not set',
    settingsTitle: 'Links, rates & privacy',
    settingsSaved: 'Links, rates and privacy saved.',
    settingsError: 'Unable to save links, rates and privacy.',
    rateError: `Use a whole number between 0 and ${MAX_TALENT_RATE.toLocaleString('en-US')}.`,
    saveSettings: 'Save links & privacy',
    ownerNote: 'Only you can see private values here; visitors see “Private”.',
  },
  bn: {
    title: 'আপনার মিডিয়া ওয়ার্ল্ড প্রোফাইল সম্পাদনা',
    lead: 'ছবি, বায়ো, লোকেশন, পেশা, পোর্টফোলিও, লিঙ্ক ও প্রাইভেসি আপডেট করুন। প্রতিটি অংশ আলাদাভাবে সংরক্ষিত হয়।',
    back: '← প্রোফাইলে ফিরুন',
    viewPublic: 'পাবলিক প্রোফাইল দেখুন',
    mediaTitle: 'প্রোফাইল ছবি ও কভার',
    mediaLead: 'প্রোফাইল ছবি কার্ড, মেসেজ ও লিস্টিংয়ে দেখা যায়। কভার ছবি আপনার পাবলিক প্রোফাইলে নামের পেছনে থাকে।',
    noCover: 'এখনো কোনো কভার ছবি নেই',
    mediaHint: 'JPEG, PNG, WebP বা GIF · সর্বোচ্চ ৫ MB।',
    aboutTitle: 'পরিচিতি ও লোকেশন',
    aboutLead: 'বায়ো ও লোকেশন ক্লায়েন্টদের আপনাকে খুঁজে পেতে সাহায্য করে।',
    bio: 'বায়ো',
    bioCount: (used: number) => `${used} / ৫০০ অক্ষর`,
    division: 'বিভাগ',
    district: 'জেলা',
    selectDivision: 'বিভাগ নির্বাচন করুন',
    selectDistrict: 'জেলা নির্বাচন করুন',
    selectDistrictFirst: 'আগে বিভাগ নির্বাচন করুন',
    presentAddress: 'বর্তমান ঠিকানা',
    addressPlaceholder: 'বাড়ি, রাস্তা, এলাকা, উপজেলা…',
    saveDetails: 'তথ্য সংরক্ষণ করুন',
    saving: 'সংরক্ষণ হচ্ছে…',
    detailsSaved: 'প্রোফাইলের তথ্য সংরক্ষিত হয়েছে।',
    detailsError: 'প্রোফাইলের তথ্য সংরক্ষণ করা যায়নি।',
    professionsTitle: 'পেশাগত পরিচয়',
    linksTitle: 'সোশ্যাল ও পেশাগত লিঙ্ক',
    linksLead: 'যেখানে ক্লায়েন্টরা আপনার কাজ দেখতে পারে এমন পাবলিক পেজ যোগ করুন। আইকন ব্যাজ প্রোফাইলে দেখা যাবে।',
    youtube: 'ইউটিউব',
    facebook: 'ফেসবুক',
    instagram: 'ইনস্টাগ্রাম',
    tiktok: 'টিকটক',
    website: 'ব্যক্তিগত ওয়েবসাইট',
    ratesTitle: 'রেট কার্ড (টাকায়)',
    ratesLead: 'কোনো ঘর খালি রাখলে সেই রেট দেখা যাবে না। “রেট দেখান” চালু থাকলেই ভিজিটররা রেট দেখে।',
    perDay: 'প্রতিদিন',
    perWeek: 'সাপ্তাহিক',
    perMonth: 'মাসিক',
    privacyTitle: 'যোগাযোগের প্রাইভেসি',
    privacyLead: 'ভিজিটররা কী দেখবে তা বেছে নিন। প্রাইভেট তথ্য তাদের ব্রাউজারে পাঠানো হয় না।',
    showPhone: 'ফোন নম্বর পাবলিক দেখান',
    showEmail: 'ইমেইল পাবলিক দেখান',
    showAddress: 'ঠিকানা পাবলিক দেখান',
    showWhatsapp: 'হোয়াটসঅ্যাপ পাবলিক দেখান',
    showRates: 'রেট পাবলিক দেখান',
    whatsapp: 'হোয়াটসঅ্যাপ নম্বর',
    whatsappHint: 'বাংলাদেশি মোবাইল, যেমন 017XXXXXXXX।',
    registered: 'নিবন্ধিত যোগাযোগ',
    registeredPhone: 'ফোন',
    registeredEmail: 'ইমেইল',
    notSet: 'দেওয়া হয়নি',
    settingsTitle: 'লিঙ্ক, রেট ও প্রাইভেসি',
    settingsSaved: 'লিঙ্ক, রেট ও প্রাইভেসি সংরক্ষিত হয়েছে।',
    settingsError: 'লিঙ্ক, রেট ও প্রাইভেসি সংরক্ষণ করা যায়নি।',
    rateError: `০ থেকে ${MAX_TALENT_RATE.toLocaleString('bn-BD')} এর মধ্যে পূর্ণ সংখ্যা দিন।`,
    saveSettings: 'লিঙ্ক ও প্রাইভেসি সংরক্ষণ',
    ownerNote: 'প্রাইভেট মান শুধু আপনিই দেখেন; ভিজিটররা “প্রাইভেট” দেখে।',
  },
} as const;

export default function TalentProfileEditor({
  profile,
  taxonomy,
  identities: initialIdentities,
}: {
  profile: TalentProfile;
  taxonomy: TaxonomySnapshot;
  identities: IdentityView[];
}) {
  const { language } = useMediaWorldLanguage();
  const t = TEXT[language];

  const settings = profile.talentSettings;
  const [images, setImages] = useState({
    profile: profile.profileImage ?? '',
    cover: profile.coverImage ?? '',
  });
  const [identities, setIdentities] = useState<IdentityView[]>(initialIdentities);
  const [details, setDetails] = useState({
    bio: profile.bio ?? '',
    division: profile.division ?? '',
    district: profile.district ?? '',
    presentAddress: profile.presentAddress ?? '',
  });
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailMessage, setDetailMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const [links, setLinks] = useState({
    whatsapp: settings?.whatsapp ?? '',
    youtubeUrl: settings?.youtubeUrl ?? '',
    facebookUrl: settings?.facebookUrl ?? '',
    instagramUrl: settings?.instagramUrl ?? '',
    tiktokUrl: settings?.tiktokUrl ?? '',
    websiteUrl: settings?.websiteUrl ?? '',
  });
  const [rates, setRates] = useState<Record<RateKey, string>>({
    ratePerDay: settings?.ratePerDay != null ? String(settings.ratePerDay) : '',
    ratePerWeek: settings?.ratePerWeek != null ? String(settings.ratePerWeek) : '',
    ratePerMonth: settings?.ratePerMonth != null ? String(settings.ratePerMonth) : '',
  });
  const [privacy, setPrivacy] = useState<Record<PrivacyKey, boolean>>({
    showPhone: settings?.showPhone ?? DEFAULT_PRIVACY.showPhone,
    showEmail: settings?.showEmail ?? DEFAULT_PRIVACY.showEmail,
    showAddress: settings?.showAddress ?? DEFAULT_PRIVACY.showAddress,
    showWhatsapp: settings?.showWhatsapp ?? DEFAULT_PRIVACY.showWhatsapp,
    showRates: settings?.showRates ?? DEFAULT_PRIVACY.showRates,
  });
  const [settingErrors, setSettingErrors] = useState<Record<string, string>>({});
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const districts = useMemo(() => districtsForDivision(details.division), [details.division]);
  const publicHref = `/mediaworld/talent/${encodeURIComponent(profile.username)}`;
  const initial = profile.name.trim().charAt(0).toUpperCase() || 'T';

  function onImagesUpdated(next: Profile) {
    setImages({ profile: next.profileImage ?? '', cover: next.coverImage ?? '' });
  }

  function setDetailField(key: keyof typeof details, value: string) {
    setDetails((current) => ({
      ...current,
      [key]: value,
      ...(key === 'division' ? { district: '' } : {}),
    }));
    setDetailErrors((current) => ({ ...current, [key]: '' }));
  }

  async function saveDetails() {
    if (detailBusy) return;
    setDetailBusy(true);
    setDetailMessage(null);
    const { ok, status, json } = await sendJson('/api/mediaworld/profile/details', 'PATCH', details);
    setDetailBusy(false);

    if (!ok) {
      const fieldErrors = readFieldErrors(json);
      setDetailErrors(Object.fromEntries(Object.entries(fieldErrors).map(([key, value]) => [key, errorText(value)])));
      const firstField = Object.keys(fieldErrors)[0];
      const firstId = firstField ? DETAIL_FIELD_IDS[firstField] : undefined;
      if (firstId) document.getElementById(firstId)?.focus();
      setDetailMessage({
        tone: 'error',
        text: status === 0 ? (language === 'bn' ? NETWORK_ERROR.bn : NETWORK_ERROR.en) : readError(json, { bn: t.detailsError, en: t.detailsError }, language === 'bn'),
      });
      return;
    }
    setDetailErrors({});
    setDetailMessage({ tone: 'ok', text: t.detailsSaved });
  }

  async function saveSettings() {
    if (settingsBusy) return;

    const nextErrors: Record<string, string> = {};
    const rateValues = {} as Record<RateKey, number | null>;
    for (const key of RATE_KEYS) {
      const raw = rates[key].trim();
      if (!raw) {
        rateValues[key] = null;
        continue;
      }
      const parsed = Number(raw);
      if (!/^\d+$/.test(raw) || parsed > MAX_TALENT_RATE) {
        nextErrors[key] = t.rateError;
        rateValues[key] = null;
        continue;
      }
      rateValues[key] = parsed;
    }
    setSettingErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSettingsBusy(true);
    setSettingsMessage(null);
    const { ok, status, json } = await sendJson('/api/mediaworld/profile/talent', 'PATCH', {
      ...links,
      ...rateValues,
      ...privacy,
    });
    setSettingsBusy(false);

    if (!ok) {
      setSettingErrors(Object.fromEntries(Object.entries(readFieldErrors(json)).map(([key, value]) => [key, errorText(value)])));
      setSettingsMessage({
        tone: 'error',
        text: status === 0 ? (language === 'bn' ? NETWORK_ERROR.bn : NETWORK_ERROR.en) : readError(json, { bn: t.settingsError, en: t.settingsError }, language === 'bn'),
      });
      return;
    }
    setSettingErrors({});
    setSettingsMessage({ tone: 'ok', text: t.settingsSaved });
  }

  const privacyRows: { key: PrivacyKey; label: string }[] = [
    { key: 'showPhone', label: t.showPhone },
    { key: 'showEmail', label: t.showEmail },
    { key: 'showWhatsapp', label: t.showWhatsapp },
    { key: 'showAddress', label: t.showAddress },
    { key: 'showRates', label: t.showRates },
  ];

  return (
    <div className='mw-editor'>
      <div className='mw-talent-profile-bar'>
        <Link href={publicHref}>{t.back}</Link>
        <Link href={publicHref}>{t.viewPublic} ↗</Link>
      </div>

      <header className='mw-editor-head'>
        <div>
          <h1>{t.title}</h1>
          <p className='mw-talent-lead'>{t.lead}</p>
        </div>
        <span className='mw-onb-badge'>{profile.username}</span>
      </header>

      <section className='mw-talent-profile-card'>
        <h2>{t.mediaTitle}</h2>
        <p className='mw-talent-muted'>{t.mediaLead}</p>
        <div className='mw-editor-media'>
          <div className='mw-editor-cover'>
            {images.cover ? <img src={images.cover} alt='' width={480} height={150} /> : <span>{t.noCover}</span>}
            <span className='mw-editor-uploader'>
              <ProfileMediaUploader kind='cover' compact onUploaded={onImagesUpdated} />
            </span>
          </div>
          <div className='mw-editor-avatar'>
            {images.profile
              ? <img src={images.profile} alt='' width={104} height={104} />
              : <span className='mw-editor-avatar-fallback' aria-hidden='true'>{initial}</span>}
            <span className='mw-editor-uploader'>
              <ProfileMediaUploader kind='profile' compact onUploaded={onImagesUpdated} />
            </span>
          </div>
        </div>
        <p className='mw-talent-muted'>{t.mediaHint}</p>
      </section>

      <section className='mw-talent-profile-card' id='about'>
        <h2>{t.aboutTitle}</h2>
        <p className='mw-talent-muted'>{t.aboutLead}</p>
        {detailMessage ? <FormAlert message={detailMessage.text} tone={detailMessage.tone} /> : null}

        <div className='mw-setup-grid'>
          <div className='mw-setup-field wide'>
            <label style={LABEL_STYLE} htmlFor='mw-editor-bio'>{t.bio}</label>
            <textarea
              id='mw-editor-bio'
              name='bio'
              className={INPUT_CLASS}
              rows={4}
              maxLength={500}
              value={details.bio}
              autoComplete='off'
              aria-invalid={Boolean(detailErrors.bio)}
              aria-describedby='mw-editor-bio-count mw-editor-bio-error'
              style={{ resize: 'vertical' }}
              onChange={(event) => setDetailField('bio', event.target.value)}
            />
            <span id='mw-editor-bio-count' className='mw-talent-muted'>{t.bioCount(details.bio.length)}</span>
            {detailErrors.bio ? <span id='mw-editor-bio-error' style={ERROR_STYLE}>{detailErrors.bio}</span> : null}
          </div>

          <div className='mw-setup-field'>
            <label style={LABEL_STYLE} htmlFor='mw-editor-division'>{t.division}</label>
            <select
              id='mw-editor-division'
              name='division'
              className={INPUT_CLASS}
              value={details.division}
              onChange={(event) => setDetailField('division', event.target.value)}
            >
              <option value=''>{t.selectDivision}</option>
              {DIVISIONS.map((division) => <option key={division} value={division}>{division}</option>)}
            </select>
            {detailErrors.division ? <span style={ERROR_STYLE}>{detailErrors.division}</span> : null}
          </div>

          <div className='mw-setup-field'>
            <label style={LABEL_STYLE} htmlFor='mw-editor-district'>{t.district}</label>
            <select
              id='mw-editor-district'
              name='district'
              className={INPUT_CLASS}
              value={details.district}
              disabled={!details.division}
              onChange={(event) => setDetailField('district', event.target.value)}
            >
              <option value=''>{details.division ? t.selectDistrict : t.selectDistrictFirst}</option>
              {districts.map((district) => <option key={district} value={district}>{district}</option>)}
            </select>
            {detailErrors.district ? <span style={ERROR_STYLE}>{detailErrors.district}</span> : null}
          </div>

          <div className='mw-setup-field wide'>
            <label style={LABEL_STYLE} htmlFor='mw-editor-present'>{t.presentAddress}</label>
            <textarea
              id='mw-editor-present'
              name='presentAddress'
              className={INPUT_CLASS}
              rows={2}
              value={details.presentAddress}
              placeholder={t.addressPlaceholder}
              style={{ resize: 'vertical' }}
              onChange={(event) => setDetailField('presentAddress', event.target.value)}
            />
            {detailErrors.presentAddress ? <span style={ERROR_STYLE}>{detailErrors.presentAddress}</span> : null}
          </div>
        </div>

        <div className='mw-setup-actions'>
          <span />
          <button type='button' className='mediaworld-cta-button' onClick={saveDetails} disabled={detailBusy}>
            {detailBusy ? t.saving : t.saveDetails}
          </button>
        </div>
      </section>

      {profile.accountType === 'PROFESSIONAL' ? (
        <section className='mw-talent-profile-card'>
          <h2>{t.professionsTitle}</h2>
          <ProfessionalStep taxonomy={taxonomy} identities={identities} onChange={setIdentities} />
        </section>
      ) : null}

      <ShowcaseManager initialItems={profile.showcaseItems} />

      <section className='mw-talent-profile-card' id='rates'>
        <h2>{t.settingsTitle}</h2>
        {settingsMessage ? <FormAlert message={settingsMessage.text} tone={settingsMessage.tone} /> : null}

        <h3>{t.linksTitle}</h3>
        <p className='mw-talent-muted'>{t.linksLead}</p>
        <div className='mw-setup-grid'>
          {([
            { key: 'youtubeUrl', label: t.youtube, placeholder: 'https://youtube.com/@…' },
            { key: 'facebookUrl', label: t.facebook, placeholder: 'https://facebook.com/…' },
            { key: 'instagramUrl', label: t.instagram, placeholder: 'https://instagram.com/…' },
            { key: 'tiktokUrl', label: t.tiktok, placeholder: 'https://tiktok.com/@…' },
            { key: 'websiteUrl', label: t.website, placeholder: 'https://example.com' },
            { key: 'whatsapp', label: t.whatsapp, placeholder: '01XXXXXXXXX' },
          ] as const).map((field) => (
            <div key={field.key} className='mw-setup-field'>
              <label style={LABEL_STYLE} htmlFor={`mw-editor-${field.key}`}>{field.label}</label>
              <input
                id={`mw-editor-${field.key}`}
                className={INPUT_CLASS}
                value={links[field.key]}
                placeholder={field.placeholder}
                inputMode={field.key === 'whatsapp' ? 'tel' : 'url'}
                onChange={(event) => {
                  setLinks((current) => ({ ...current, [field.key]: event.target.value }));
                  setSettingErrors((current) => ({ ...current, [field.key]: '' }));
                }}
              />
              {field.key === 'whatsapp' ? <span className='mw-talent-muted'>{t.whatsappHint}</span> : null}
              {settingErrors[field.key] ? <span style={ERROR_STYLE}>{settingErrors[field.key]}</span> : null}
            </div>
          ))}
        </div>

        <h3>{t.ratesTitle}</h3>
        <p className='mw-talent-muted'>{t.ratesLead}</p>
        <div className='mw-setup-grid'>
          {([
            { key: 'ratePerDay', label: t.perDay },
            { key: 'ratePerWeek', label: t.perWeek },
            { key: 'ratePerMonth', label: t.perMonth },
          ] as const).map((field) => (
            <div key={field.key} className='mw-setup-field'>
              <label style={LABEL_STYLE} htmlFor={`mw-editor-${field.key}`}>{field.label}</label>
              <input
                id={`mw-editor-${field.key}`}
                className={INPUT_CLASS}
                value={rates[field.key]}
                inputMode='numeric'
                placeholder='0'
                onChange={(event) => {
                  setRates((current) => ({ ...current, [field.key]: event.target.value }));
                  setSettingErrors((current) => ({ ...current, [field.key]: '' }));
                }}
              />
              {settingErrors[field.key] ? <span style={ERROR_STYLE}>{settingErrors[field.key]}</span> : null}
            </div>
          ))}
        </div>

        <h3>{t.privacyTitle}</h3>
        <p className='mw-talent-muted'>{t.privacyLead}</p>
        <div className='mw-contact-privacy'>
          <div className='mw-registered'>
            <span>{t.registeredPhone}: <strong>{profile.phone || t.notSet}</strong></span>
            <span>{t.registeredEmail}: <strong>{profile.email || t.notSet}</strong></span>
          </div>
          <div className='mw-toggle-list'>
            {privacyRows.map((row) => (
              <label key={row.key} className='mw-toggle-row'>
                <input
                  type='checkbox'
                  checked={privacy[row.key]}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setPrivacy((current) => ({ ...current, [row.key]: checked }));
                  }}
                />
                <span>{row.label}</span>
              </label>
            ))}
          </div>
          <p className='mw-talent-muted'>{t.ownerNote}</p>
        </div>

        <div className='mw-setup-actions'>
          <span />
          <button type='button' className='mediaworld-cta-button' onClick={saveSettings} disabled={settingsBusy}>
            {settingsBusy ? t.saving : t.saveSettings}
          </button>
        </div>
      </section>
    </div>
  );
}
