'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  COMPLAINT_IMAGE_MIME_TYPES,
  COMPLAINT_VIDEO_MIME_TYPES,
  MAX_COMPLAINT_ATTACHMENTS,
  MAX_COMPLAINT_IMAGE_BYTES,
  MAX_COMPLAINT_VIDEO_BYTES,
  MEDIA_COMPLAINT_PERSON_LABELS,
  type MediaComplaintPersonType,
} from '@/lib/mediaworld-complaint';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';

type FieldErrors = Record<string, string | string[]>;

const INPUT_CLASS =
  'w-full rounded-xl border-0 bg-[#1e1f22] px-4 py-3 text-sm text-[#e4e6eb] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#2d88ff]/40';

const LABEL_CLASS = { display: 'block', fontSize: '13px', fontWeight: 700, color: '#d1d5db', marginBottom: 8 } as const;
const ERROR_CLASS = { color: '#ff6b6b', fontSize: '0.8rem' } as const;

const PERSON_TYPES = Object.keys(MEDIA_COMPLAINT_PERSON_LABELS) as MediaComplaintPersonType[];

type AttachmentPreview = {
  id: string;
  file: File;
  kind: 'IMAGE' | 'VIDEO';
  url: string;
};

export default function ComplaintForm() {
  const { language } = useMediaWorldLanguage();
  const [form, setForm] = useState({ subject: '', details: '', contact: '', personType: 'OTHER', personName: '' });
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverMsg, setServerMsg] = useState('');
  const [ok, setOk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useRef<string[]>([]);

  const bn = language === 'bn';

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setOk(false);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function clearAttachments() {
    for (const url of previewUrls.current) URL.revokeObjectURL(url);
    previewUrls.current = [];
    setAttachments([]);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.attachments;
      return next;
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!picked.length) return;

    const nextErrors: string[] = [];
    const accepted: AttachmentPreview[] = [];

    for (const file of picked) {
      if (attachments.length + accepted.length >= MAX_COMPLAINT_ATTACHMENTS) {
        nextErrors.push(bn
          ? `সর্বোচ্চ ${MAX_COMPLAINT_ATTACHMENTS}টি ফাইল যোগ করা যাবে।`
          : `You can attach up to ${MAX_COMPLAINT_ATTACHMENTS} files.`);
        break;
      }
      const isVideo = COMPLAINT_VIDEO_MIME_TYPES.includes(file.type as (typeof COMPLAINT_VIDEO_MIME_TYPES)[number]);
      const isImage = COMPLAINT_IMAGE_MIME_TYPES.includes(file.type as (typeof COMPLAINT_IMAGE_MIME_TYPES)[number]);
      if (isVideo) {
        if (file.size > MAX_COMPLAINT_VIDEO_BYTES) {
          nextErrors.push(bn ? 'ভিডিও 25 MB বা তার কম হতে হবে।' : 'Video must be 25 MB or smaller.');
          continue;
        }
      } else if (isImage) {
        if (file.size > MAX_COMPLAINT_IMAGE_BYTES) {
          nextErrors.push(bn ? 'ছবি 5 MB বা তার কম হতে হবে।' : 'Image must be 5 MB or smaller.');
          continue;
        }
      } else {
        nextErrors.push(bn
          ? 'শুধু JPEG, PNG, WebP, GIF ছবি বা MP4, WebM, MOV ভিডিও দেওয়া যাবে।'
          : 'Only JPEG, PNG, WebP, GIF images or MP4, WebM, MOV videos are allowed.');
        continue;
      }
      const url = URL.createObjectURL(file);
      previewUrls.current.push(url);
      accepted.push({
        id: `${file.name}-${file.size}-${url}`,
        file,
        kind: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
        url,
      });
    }

    setAttachments((prev) => [...prev, ...accepted]);
    setErrors((prev) => {
      const next = { ...prev };
      if (nextErrors.length) next.attachments = nextErrors;
      else delete next.attachments;
      return next;
    });
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
        previewUrls.current = previewUrls.current.filter((url) => url !== target.url);
      }
      return prev.filter((item) => item.id !== id);
    });
  }
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: FieldErrors = {};
    if (form.subject.trim().length < 3 || form.subject.trim().length > 120) next.subject = 'Subject must be 3-120 characters.';
    if (form.details.trim().length < 10 || form.details.trim().length > 2000) next.details = 'Details must be 10-2000 characters.';
    if (form.contact.trim().length > 120) next.contact = 'Contact must be 120 characters or fewer.';
    if (form.personName.trim().length > 120) next.personName = 'Person name must be 120 characters or fewer.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setServerMsg('');
    try {
      const body = new FormData();
      body.set('subject', form.subject.trim());
      body.set('details', form.details.trim());
      body.set('contact', form.contact.trim());
      body.set('personType', form.personType);
      body.set('personName', form.personName.trim());
      for (const attachment of attachments) body.append('attachments', attachment.file);

      const res = await fetch('/api/mediaworld/complaint', {
        method: 'POST',
        body,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setServerMsg(json?.error ?? (bn ? 'অভিযোগ পাঠানো যায়নি।' : 'Unable to submit complaint.'));
        if (json?.fields) setErrors(json.fields);
        return;
      }
      setOk(true);
      setServerMsg(bn
        ? 'আপনার অভিযোগটি গ্রহণ করা হয়েছে। আমাদের টিম শীঘ্রই এটি পর্যালোচনা করবে।'
        : 'Your complaint has been received. Our team will review it shortly.');
      setForm({ subject: '', details: '', contact: '', personType: 'OTHER', personName: '' });
      clearAttachments();
    } catch {
      setServerMsg(bn
        ? 'নেটওয়ার্ক সমস্যা হয়েছে। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।'
        : 'Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const attachmentErrors = errors.attachments;

  return (
    <>
      {serverMsg ? (
        <div
          role="alert"
          style={{
            background: ok ? '#123024' : '#1f2937',
            border: `1px solid ${ok ? '#22c55e66' : '#4b5563'}`,
            color: '#e5e7eb',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: 16,
            fontSize: '0.95rem',
          }}
        >
          {serverMsg}
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_CLASS} htmlFor='mw-complaint-subject'>
            {bn ? 'বিষয়' : 'Subject'}
          </label>
          <input
            id='mw-complaint-subject'
            type='text'
            value={form.subject}
            onChange={(e) => setField('subject', e.target.value)}
            className={INPUT_CLASS}
            placeholder={bn ? 'যেমন: সার্ভিস কার্ডে ভুল দাম দেখানো হয়েছে' : 'Example: Wrong price listed on the service card'}
          />
          {errors.subject ? <span style={ERROR_CLASS}>{errors.subject}</span> : null}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_CLASS} htmlFor='mw-complaint-details'>
            {bn ? 'বিস্তারিত' : 'Details'}
          </label>
          <textarea
            id='mw-complaint-details'
            value={form.details}
            onChange={(e) => setField('details', e.target.value)}
            rows={6}
            className={INPUT_CLASS}
            placeholder={bn
              ? 'যেমন: ক্যামেরা ভাড়ার দাম ওয়েবসাইটের চেয়ে বেশি দেখানো হয়েছে, অনুগ্রহ করে দেখুন।'
              : 'Example: The camera rental price is higher than the website price. Please check.'}
          ></textarea>
          {errors.details ? <span style={ERROR_CLASS}>{errors.details}</span> : null}
        </div>

        <div className='mediaworld-complaint-person'>
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL_CLASS} htmlFor='mw-complaint-person-type'>
              {bn ? 'কার সম্পর্কে অভিযোগ?' : 'Who is the complaint about?'}
            </label>
            <select
              id='mw-complaint-person-type'
              value={form.personType}
              onChange={(e) => setField('personType', e.target.value)}
              className={INPUT_CLASS}
            >
              {PERSON_TYPES.map((type) => (
                <option key={type} value={type}>
                  {MEDIA_COMPLAINT_PERSON_LABELS[type][language]}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={LABEL_CLASS} htmlFor='mw-complaint-person-name'>
              {bn ? 'নাম (ঐচ্ছিক)' : 'Name (optional)'}
            </label>
            <input
              id='mw-complaint-person-name'
              type='text'
              value={form.personName}
              onChange={(e) => setField('personName', e.target.value)}
              className={INPUT_CLASS}
              placeholder={bn ? 'যেমন: করিম উদ্দিন' : 'Example: Karim Uddin'}
            />
            {errors.personName ? <span style={ERROR_CLASS}>{errors.personName}</span> : null}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <span style={LABEL_CLASS}>{bn ? 'প্রমাণ (ছবি বা ভিডিও)' : 'Evidence (image or video)'}</span>
          <input
            ref={fileInputRef}
            id='mw-complaint-attachments'
            type='file'
            multiple
            accept='image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/x-m4v'
            onChange={handleFileChange}
            className='mediaworld-complaint-file-input'
            aria-label={bn ? 'ছবি বা ভিডিও যোগ করুন' : 'Add images or videos'}
          />
          <div className='mediaworld-complaint-attach-actions'>
            <button
              type='button'
              className='mediaworld-complaint-attach-btn'
              onClick={() => fileInputRef.current?.click()}
            >
              <span aria-hidden='true'>📎</span>
              {bn ? 'ছবি বা ভিডিও যোগ করুন' : 'Add image or video'}
            </button>
            <span className='mediaworld-complaint-attach-hint'>
              {bn
                ? `সর্বোচ্চ ${MAX_COMPLAINT_ATTACHMENTS}টি · ছবি ৫ MB · ভিডিও ২৫ MB`
                : `Up to ${MAX_COMPLAINT_ATTACHMENTS} files · image 5 MB · video 25 MB`}
            </span>
          </div>

          {attachments.length > 0 ? (
            <ul className='mediaworld-complaint-preview-grid'>
              {attachments.map((attachment) => (
                <li key={attachment.id} className='mediaworld-complaint-preview'>
                  {attachment.kind === 'VIDEO' ? (
                    <video src={attachment.url} muted playsInline />
                  ) : (
                    <img src={attachment.url} alt={attachment.file.name} />
                  )}
                  <button
                    type='button'
                    aria-label={bn ? 'ফাইল সরান' : 'Remove file'}
                    onClick={() => removeAttachment(attachment.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {attachmentErrors ? (
            <span style={ERROR_CLASS}>
              {Array.isArray(attachmentErrors) ? attachmentErrors.join(' ') : attachmentErrors}
            </span>
          ) : null}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={LABEL_CLASS} htmlFor='mw-complaint-contact'>
            {bn ? 'সম্পর্কিত যোগাযোগ (ঐচ্ছিক)' : 'Contact (optional)'}
          </label>
          <input
            id='mw-complaint-contact'
            type='text'
            value={form.contact}
            onChange={(e) => setField('contact', e.target.value)}
            className={INPUT_CLASS}
            placeholder='যেমন: 01700000000'
          />
          {errors.contact ? <span style={ERROR_CLASS}>{errors.contact}</span> : null}
        </div>

        <button
          type='submit'
          disabled={submitting}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: '10px',
            border: '0',
            background: '#2d88ff',
            color: '#0c1220',
            fontWeight: 800,
            fontSize: '15px',
            cursor: submitting ? 'wait' : 'pointer',
          }}
        >
          {submitting ? (bn ? 'পাঠাচ্ছে...' : 'Sending...') : (bn ? 'পাঠান' : 'Submit')}
        </button>
        <p style={{ color: '#6b7280', fontSize: '12px', marginTop: 10 }}>
          {bn
            ? 'আপনার তথ্য শুধু আমাদের টিমের কাছে পাঠানো হবে এবং অভিযোগের সমাধানের জন্য ব্যবহার করা হবে।'
            : 'Your information is only shared with our team and used to resolve the complaint.'}
        </p>
        <Link
          href='/mediaworld'
          style={{
            display: 'block',
            textAlign: 'center',
            marginTop: 14,
            color: '#7b8494',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          {bn ? 'বাতিল করে ফিরে যান' : 'Cancel and go back'}
        </Link>
      </form>
    </>
  );
}
