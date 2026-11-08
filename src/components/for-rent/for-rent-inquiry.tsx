'use client';

import { useState } from 'react';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { Field, FormAlert } from '@/components/ui/form-field';
import { INPUT_CLASS, NETWORK_ERROR, postJson, readError, readFieldErrors, type FieldErrors } from '@/lib/client/forms';

type Props = {
  listingId: string;
  viewerName: string;
  viewerEmail: string;
  closed: boolean;
};

export default function ForRentInquiry({ listingId, viewerName, viewerEmail, closed }: Props) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const [name, setName] = useState(viewerName);
  const [email, setEmail] = useState(viewerEmail);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setBanner(null);
    setErrors({});
    const result = await postJson(`/api/for-rent/${listingId}/inquiry`, {
      name,
      email,
      phone: phone || undefined,
      message,
    });
    setSending(false);

    if (result.ok) {
      setPhone('');
      setMessage('');
      setBanner({
        tone: 'ok',
        text: bn
          ? 'আপনার জিজ্ঞাসা পাঠানো হয়েছে। এটি বুকিং নিশ্চিত করে না — প্রোভাইডার উত্তর দিলে পরবর্তী ধাপ ঠিক হবে।'
          : 'Your inquiry has been sent. It does not confirm a booking; the next steps are agreed with the provider.',
      });
      return;
    }

    setErrors(readFieldErrors(result.json));
    setBanner({
      tone: 'error',
      text: result.status === 0
        ? bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en
        : readError(result.json, { bn: 'জিজ্ঞাসা পাঠানো যায়নি।', en: 'Unable to send your inquiry.' }, bn),
    });
  }

  return (
    <form className='mw-rent-inquiry' onSubmit={submit}>
      <h3 className='mw-rent-inquiry-title'>{bn ? 'প্রোভাইডারকে জিজ্ঞাসা করুন' : 'Ask the provider'}</h3>
      {banner ? <FormAlert message={banner.text} tone={banner.tone} /> : null}
      {closed ? (
        <p className='mw-rent-closed'>
          {bn ? 'এই তালিকা এখন জিজ্ঞাসা নিচ্ছে না।' : 'This listing is not accepting inquiries right now.'}
        </p>
      ) : null}
      <div className='mw-rent-two-col'>
        <Field id='name' label={bn ? 'আপনার নাম' : 'Your name'} errors={errors}>
          <input id='name' className={INPUT_CLASS} value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
        </Field>
        <Field id='email' label={bn ? 'ইমেইল' : 'Email'} errors={errors}>
          <input id='email' type='email' className={INPUT_CLASS} value={email} onChange={(event) => setEmail(event.target.value)} maxLength={255} required />
        </Field>
      </div>
      <Field id='phone' label={bn ? 'ফোন (ঐচ্ছিক)' : 'Phone (optional)'} errors={errors}>
        <input id='phone' className={INPUT_CLASS} value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={20} />
      </Field>
      <Field
        id='message'
        label={bn ? 'বার্তা' : 'Message'}
        errors={errors}
        hint={bn ? 'তারিখ, সময় ও সরঞ্জামের বিবরণ লিখুন (কমপক্ষে ১০ অক্ষর)।' : 'Mention dates, duration and the equipment you need (at least 10 characters).'}
      >
        <textarea id='message' className={`${INPUT_CLASS} mw-rent-textarea`} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={4} required />
      </Field>
      <button className='mw-rent-submit' type='submit' disabled={sending || closed}>
        {sending ? (bn ? 'পাঠানো হচ্ছে…' : 'Sending…') : bn ? 'জিজ্ঞাসা পাঠান' : 'Send inquiry'}
      </button>
    </form>
  );
}
