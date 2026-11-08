'use client';

import { useState } from 'react';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { Field, FormAlert } from '@/components/ui/form-field';
import { INPUT_CLASS, NETWORK_ERROR, postJson, readError, readFieldErrors, type FieldErrors } from '@/lib/client/forms';

const REASONS = [
  { value: 'Spam', bn: 'স্প্যাম', en: 'Spam' },
  { value: 'Fake listing', bn: 'মিথ্যা তালিকা', en: 'Fake listing' },
  { value: 'Wrong price or details', bn: 'ভুল দাম বা তথ্য', en: 'Wrong price or details' },
  { value: 'Unsafe or illegal', bn: 'নিরাপত্তাহীন বা অবৈধ', en: 'Unsafe or illegal' },
  { value: 'Other', bn: 'অন্যান্য', en: 'Other' },
];

export default function ForRentReport({ listingId }: { listingId: string }) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0].value);
  const [details, setDetails] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setBanner(null);
    setErrors({});
    const result = await postJson(`/api/for-rent/${listingId}/report`, { reason, details: details || undefined });
    setSending(false);

    if (result.ok) {
      setDetails('');
      setOpen(false);
      setBanner({ tone: 'ok', text: bn ? 'রিপোর্ট জমা হয়েছে। ধন্যবাদ।' : 'Thanks — your report was submitted.' });
      return;
    }

    setErrors(readFieldErrors(result.json));
    setBanner({
      tone: 'error',
      text: result.status === 0
        ? bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en
        : readError(result.json, { bn: 'রিপোর্ট জমা যায়নি।', en: 'Unable to submit the report.' }, bn),
    });
  }

  return (
    <div className='mw-rent-report'>
      {banner ? <FormAlert message={banner.text} tone={banner.tone} /> : null}
      <button type='button' className='mw-rent-report-toggle' aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        {bn ? 'তালিকাটি রিপোর্ট করুন' : 'Report this listing'}
      </button>
      {open ? (
        <form className='mw-rent-report-form' onSubmit={submit}>
          <Field id='reason' label={bn ? 'কারণ' : 'Reason'} errors={errors}>
            <select id='reason' className={INPUT_CLASS} value={reason} onChange={(event) => setReason(event.target.value)}>
              {REASONS.map((item) => (
                <option key={item.value} value={item.value}>{item[bn ? 'bn' : 'en']}</option>
              ))}
            </select>
          </Field>
          <Field id='details' label={bn ? 'বিবরণ (ঐচ্ছিক)' : 'Details (optional)'} errors={errors}>
            <textarea id='details' className={`${INPUT_CLASS} mw-rent-textarea`} value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} rows={3} />
          </Field>
          <button className='mw-rent-submit ghost' type='submit' disabled={sending}>
            {sending ? (bn ? 'জমা হচ্ছে…' : 'Submitting…') : bn ? 'রিপোর্ট জমা দিন' : 'Submit report'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
