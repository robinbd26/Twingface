'use client';

import { useState } from 'react';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import type { OrganizationView } from '@/lib/mediaworld/onboarding';
import type { TaxonomySnapshot } from '@/lib/mediaworld/taxonomy';
import { nodeName } from '@/lib/mediaworld/labels';
import { LogoPicker } from './form-field';
import { Field, FormAlert } from '@/components/ui/form-field';
import {
  INPUT_CLASS,
  NETWORK_ERROR,
  readError,
  readFieldErrors,
  sendForm,
  type FieldErrors,
} from '@/lib/client/forms';

const FALLBACK = { bn: 'প্রোফাইল সংরক্ষণ করা যায়নি।', en: 'Unable to save the organization profile.' };

export default function BusinessStep({
  taxonomy,
  organization,
  onSaved,
}: {
  taxonomy: TaxonomySnapshot;
  organization: OrganizationView | null;
  onSaved: (organization: OrganizationView) => void;
}) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';

  const [form, setForm] = useState({
    orgTypeId: organization?.orgTypeId ?? '',
    orgName: organization?.orgName ?? '',
    contactName: organization?.contactName ?? '',
    phone: organization?.phone ?? '',
    email: organization?.email ?? '',
    address: organization?.address ?? '',
    city: organization?.city ?? '',
    website: organization?.website ?? '',
    description: organization?.description ?? '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setErrors({});

    const body = new FormData();
    for (const [key, value] of Object.entries(form)) body.set(key, value.trim());
    if (logoFile) body.set('logo', logoFile);

    const { ok, status, json } = await sendForm('/api/mediaworld/organization', 'PUT', body);
    setBusy(false);

    if (!ok) {
      setErrors(readFieldErrors(json));
      setMessage({
        tone: 'error',
        text: status === 0 ? (bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en) : readError(json, FALLBACK, bn),
      });
      return;
    }

    const saved = (json as { organization?: OrganizationView } | null)?.organization;
    if (!saved) {
      setMessage({ tone: 'error', text: readError(null, FALLBACK, bn) });
      return;
    }
    onSaved(saved);
    setLogoFile(null);
    setMessage({ tone: 'ok', text: bn ? 'প্রতিষ্ঠানের প্রোফাইল সংরক্ষিত হয়েছে।' : 'Organization profile saved.' });
  }

  const orgTypes = taxonomy.organizationTypes;

  return (
    <div className='mw-onb-step'>
      <h2>{bn ? 'প্রতিষ্ঠানের তথ্য' : 'Organization details'}</h2>
      <p className='mw-onb-lead'>
        {bn
          ? 'ব্যবসা বা প্রতিষ্ঠানের তথ্য দিন। এই অ্যাকাউন্টে প্রফেশনাল পদ বাছাই করতে হয় না।'
          : 'Business accounts keep organization details separate from personal professional profiles — no designations required.'}
      </p>

      {message ? <FormAlert message={message.text} tone={message.tone} /> : null}

      <form onSubmit={handleSubmit}>
        <Field id='orgTypeId' label={bn ? 'প্রতিষ্ঠানের ধরন' : 'Organization type'} errors={errors}>
          <select
            id='orgTypeId'
            className={INPUT_CLASS}
            value={form.orgTypeId}
            onChange={(event) => setField('orgTypeId', event.target.value)}
          >
            <option value=''>{bn ? 'ধরন বেছে নিন' : 'Select a type'}</option>
            {orgTypes.map((type) => (
              <option key={type.id} value={type.id}>{nodeName(type, bn)}</option>
            ))}
          </select>
        </Field>

        <div className='mw-onb-two-col'>
          <Field id='orgName' label={bn ? 'প্রতিষ্ঠানের নাম' : 'Organization name'} errors={errors}>
            <input
              id='orgName'
              type='text'
              className={INPUT_CLASS}
              value={form.orgName}
              onChange={(event) => setField('orgName', event.target.value)}
              placeholder={bn ? 'যেমন: ঢাকা সিনেমেটিক' : 'Example: Dhaka Cinematic'}
            />
          </Field>

          <Field id='contactName' label={bn ? 'সম্পর্কিত ব্যক্তির নাম' : 'Contact person'} errors={errors}>
            <input
              id='contactName'
              type='text'
              className={INPUT_CLASS}
              value={form.contactName}
              onChange={(event) => setField('contactName', event.target.value)}
              placeholder={bn ? 'যেমন: রফিকুল ইসলাম' : 'Example: Rafiqul Islam'}
            />
          </Field>

          <Field id='phone' label={bn ? 'ফোন (ঐচ্ছিক)' : 'Phone (optional)'} errors={errors}>
            <input id='phone' type='tel' className={INPUT_CLASS} value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder='01700000000' />
          </Field>

          <Field id='email' label={bn ? 'ইমেইল (ঐচ্ছিক)' : 'Email (optional)'} errors={errors}>
            <input id='email' type='email' className={INPUT_CLASS} value={form.email} onChange={(event) => setField('email', event.target.value)} placeholder='name@example.com' />
          </Field>

          <Field id='city' label={bn ? 'শহর (ঐচ্ছিক)' : 'City (optional)'} errors={errors}>
            <input id='city' type='text' className={INPUT_CLASS} value={form.city} onChange={(event) => setField('city', event.target.value)} placeholder={bn ? 'ঢাকা' : 'Dhaka'} />
          </Field>

          <Field id='website' label={bn ? 'ওয়েবসাইট / পোর্টফোলিও (ঐচ্ছিক)' : 'Website / portfolio (optional)'} errors={errors}>
            <input id='website' type='url' className={INPUT_CLASS} value={form.website} onChange={(event) => setField('website', event.target.value)} placeholder='https://example.com' />
          </Field>
        </div>

        <Field id='address' label={bn ? 'অফিস ঠিকানা (ঐচ্ছিক)' : 'Office address (optional)'} errors={errors}>
          <input id='address' type='text' className={INPUT_CLASS} value={form.address} onChange={(event) => setField('address', event.target.value)} />
        </Field>

        <Field
          id='description'
          label={bn ? 'প্রতিষ্ঠানের বিবরণ (ঐচ্ছিক)' : 'Business description (optional)'}
          errors={errors}
          hint={bn ? 'কোন ধরনের প্রোডাকশন ও সার্ভিস নিয়ে কাজ কর তা লিখুন।' : 'Describe the services you offer.'}
        >
          <textarea
            id='description'
            rows={5}
            className={INPUT_CLASS}
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
          />
        </Field>

        <LogoPicker
          id='mw-onb-org-logo'
          label={bn ? 'লোগো (ঐচ্ছিক)' : 'Logo (optional)'}
          bn={bn}
          logoUrl={organization?.logoUrl ?? null}
          file={logoFile}
          error={errors.logo}
          onSelect={setLogoFile}
        />

        <button type='submit' className='mediaworld-cta-button' disabled={busy || !orgTypes.length}>
          {busy ? (bn ? 'সংরক্ষণ হচ্ছে…' : 'Saving…') : (bn ? 'সংরক্ষণ করুন' : 'Save profile')}
        </button>
        <p style={{ color: '#6b7280', fontSize: 12, marginTop: 10 }}>
          {bn
            ? 'যোগাযোগের তথ্য শুধু আপনার প্রাইভেসি সেটিং অনুযায়ী দেখানো হবে।'
            : 'Contact details are only shown according to your privacy settings.'}
        </p>
      </form>
    </div>
  );
}
