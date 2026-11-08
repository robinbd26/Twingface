'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MAX_PROFILE_MEDIA_BYTES, PROFILE_MEDIA_MIME_TYPES, type ProfileMediaKind } from '@/lib/profile-media';
import type { Profile } from '@/lib/profile';

type ProfileMediaUploaderProps = {
  kind: ProfileMediaKind;
  onUploaded?: (profile: Profile) => void;
  compact?: boolean;
  className?: string;
};

const labels: Record<ProfileMediaKind, string> = {
  profile: 'Edit profile photo',
  cover: 'Edit cover photo',
};

export default function ProfileMediaUploader({ kind, onUploaded, compact = false, className = '' }: ProfileMediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `profile-media-${kind}-input`;
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  async function selectImage(image: File | null) {
    if (!image) return;
    if (!PROFILE_MEDIA_MIME_TYPES.includes(image.type as (typeof PROFILE_MEDIA_MIME_TYPES)[number])) {
      setMessage('Choose a JPEG, PNG, WebP, or GIF image.');
      return;
    }
    if (image.size > MAX_PROFILE_MEDIA_BYTES) {
      setMessage('Image must be 5 MB or smaller.');
      return;
    }

    setUploading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.set('kind', kind);
      formData.set('image', image);
      const response = await fetch('/api/profile/media', { method: 'POST', body: formData });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.profile) throw new Error(data?.error || 'Unable to upload your image. Please try again.');

      setMessage(`${kind === 'profile' ? 'Profile' : 'Cover'} photo updated.`);
      if (onUploaded) onUploaded(data.profile as Profile);
      else router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload your image. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <span className={`profile-media-uploader ${compact ? 'profile-media-uploader-compact' : ''} ${className}`.trim()}>
      <input
        ref={inputRef}
        id={inputId}
        className='file-input-visually-hidden'
        type='file'
        accept='image/jpeg,image/png,image/webp,image/gif'
        aria-label={labels[kind]}
        onChange={(event) => { void selectImage(event.target.files?.[0] ?? null); }}
      />
      <label className='profile-media-trigger' htmlFor={inputId} aria-label={labels[kind]} aria-disabled={uploading} onClick={(event) => { if (uploading) event.preventDefault(); }}>
        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
          <path d='M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z' /><circle cx='12' cy='13' r='3' />
        </svg>
        {!compact && <span>{uploading ? 'Uploading…' : labels[kind]}</span>}
      </label>
      <span className='profile-media-feedback' aria-live='polite' role={message && !message.endsWith('updated.') ? 'alert' : 'status'}>{message}</span>
    </span>
  );
}
