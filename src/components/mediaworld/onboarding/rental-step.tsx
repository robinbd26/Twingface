'use client';

import { useState } from 'react';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import type { ProviderView } from '@/lib/mediaworld/onboarding';
import { LogoPicker } from './form-field';
import { Field, FormAlert } from '@/components/ui/form-field';
import { nodeName } from '@/lib/mediaworld/labels';
import {
  INPUT_CLASS,
  NETWORK_ERROR,
  readError,
  readFieldErrors,
  sendForm,
  type FieldErrors,
} from '@/lib/client/forms';
import type { TaxonomySnapshot } from '@/lib/mediaworld/taxonomy';

const FALLBACK = { bn: 'রেন্টাল প্রোভাইডার প্রোফাইল সংরক্ষণ করা যায়নি।', en: 'Unable to save the rental provider profile.' };

export default function RentalStep({
  taxonomy,
  provider,
  onSaved,
}: {
  taxonomy: TaxonomySnapshot;
  provider: ProviderView | null;
  onSaved: (provider: ProviderView) => void;
}) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';

  const [form, setForm] = useState({
    ownerName: provider?.ownerName ?? '',
    businessName: provider?.businessName ?? '',
    phone: provider?.phone ?? '',
    email: provider?.email ?? '',
    location: provider?.location ?? '',
    fullAddress: provider?.fullAddress ?? '',
    description: provider?.description ?? '',
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

    const { ok, status, json } = await sendForm('/api/mediaworld/rental-provider', 'PUT', body);
    setBusy(false);

    if (!ok) {
      setErrors(readFieldErrors(json));
      setMessage({
        tone: 'error',
        text: status === 0 ? (bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en) : readError(json, FALLBACK, bn),
      });
      return;
    }

    const saved = (json as { provider?: ProviderView } | null)?.provider;
    if (!saved) {
      setMessage({ tone: 'error', text: readError(null, FALLBACK, bn) });
      return;
    }
    onSaved(saved);
    setLogoFile(null);
    setMessage({ tone: 'ok', text: bn ? 'রেন্টাল প্রোফাইল সংরক্ষিত হয়েছে।' : 'Rental provider profile saved.' });
  }

  return (
    <div className='mw-onb-step'>
      <h2>{bn ? 'রেন্টাল সার্ভিসের তথ্য' : 'Rental service details'}</h2>
      <p className='mw-onb-lead'>
        {bn
          ? 'এই অ্যাকাউন্টে Film, Natok, TVC বা Music পেশা বাছাই করার প্রয়োজন নেই। শুধু আপনার ভাড়ার সার্ভিসের তথ্য দিন।'
          : 'For Rent accounts never see Film, Natok, TVC or Music designation fields — only rental service information.'}
      </p>

      {message ? <FormAlert message={message.text} tone={message.tone} /> : null}

      <form onSubmit={handleSubmit}>
        <div className='mw-onb-two-col'>
          <Field id='ownerName' label={bn ? 'মালিক / সম্পর্কিত ব্যক্তির নাম' : 'Owner or contact person'} errors={errors}>
            <input
              id='ownerName'
              type='text'
              className={INPUT_CLASS}
              value={form.ownerName}
              onChange={(event) => setField('ownerName', event.target.value)}
              placeholder={bn ? 'যেমন: জাহাঙ্গীর আলম' : 'Example: Jahangir Alam'}
            />
          </Field>

          <Field id='businessName' label={bn ? 'ব্যবসার নাম (ঐচ্ছিক)' : 'Rental business name (optional)'} errors={errors}>
            <input
              id='businessName'
              type='text'
              className={INPUT_CLASS}
              value={form.businessName}
              onChange={(event) => setField('businessName', event.target.value)}
              placeholder={bn ? 'যেমন: ক্যামেরা বাজার' : 'Example: Camera Bazar'}
            />
          </Field>

          <Field id='phone' label={bn ? 'ফোন' : 'Phone'} errors={errors}>
            <input id='phone' type='tel' className={INPUT_CLASS} value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder='01700000000' />
          </Field>

          <Field id='email' label={bn ? 'ইমেইল (ঐচ্ছিক)' : 'Email (optional)'} errors={errors}>
            <input id='email' type='email' className={INPUT_CLASS} value={form.email} onChange={(event) => setField('email', event.target.value)} placeholder='name@example.com' />
          </Field>

          <Field id='location' label={bn ? 'সার্ভিসের লোকেশন' : 'Service location'} errors={errors}>
            <input id='location' type='text' className={INPUT_CLASS} value={form.location} onChange={(event) => setField('location', event.target.value)} placeholder={bn ? 'যেমন: মিরপুর, ঢাকা' : 'Example: Mirpur, Dhaka'} />
          </Field>

          <Field id='fullAddress' label={bn ? 'পূর্ণ ঠিকানা (ঐচ্ছিক)' : 'Full address (optional)'} errors={errors}>
            <input id='fullAddress' type='text' className={INPUT_CLASS} value={form.fullAddress} onChange={(event) => setField('fullAddress', event.target.value)} />
          </Field>
        </div>

        <Field
          id='description'
          label={bn ? 'সার্ভিসের বিবরণ' : 'Service description'}
          errors={errors}
          hint={bn ? 'কী কী ভাড়া দেন, কন্ডিশন ও শর্ত লিখুন (কমপক্ষে ১০ অক্ষর)।' : 'What you rent out, condition and terms (at least 10 characters).'}
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
          id='mw-onb-provider-logo'
          label={bn ? 'প্রোফাইল ছবি বা লোগো (ঐচ্ছিক)' : 'Profile photo or logo (optional)'}
          bn={bn}
          logoUrl={provider?.logoUrl ?? null}
          file={logoFile}
          error={errors.logo}
          onSelect={setLogoFile}
        />

        <button type='submit' className='mediaworld-cta-button' disabled={busy}>
          {busy ? (bn ? 'সংরক্ষণ হচ্ছে…' : 'Saving…') : (bn ? 'সংরক্ষণ করুন' : 'Save profile')}
        </button>

        <div className='mw-onb-categories'>
          <h3>{bn ? 'আপনি যা ভাড়া দিতে পারেন' : 'What you can rent out'}</h3>
          <div className='mw-onb-chips'>
            {taxonomy.rentalCategories.map((category) => (
              <span key={category.id} className='mw-onb-chip static'>
                {nodeName(category, bn)}
                <small>{category.subcategories.length}</small>
              </span>
            ))}
          </div>
          <p className='mw-onb-muted'>
            {bn
              ? 'প্রোফাইল সংরক্ষণের পর আপনার রেন্টাল লিস্টিং তৈরি ও পরিচালনা করতে পারবেন।'
              : 'Once the profile is saved you can create and manage your own rental listings.'}
          </p>
        </div>
      </form>
    </div>
  );
}
