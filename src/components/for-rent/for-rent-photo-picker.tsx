'use client';

import { useEffect, useState } from 'react';
import { ERROR_STYLE } from '@/lib/client/forms';

type ExistingPhoto = { id: string; url: string };

type Props = {
  bn: boolean;
  max: number;
  existing: ExistingPhoto[];
  retainedIds: string[];
  files: File[];
  error: string | string[] | undefined;
  onToggleExisting: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
};

export default function ForRentPhotoPicker({ bn, max, existing, retainedIds, files, error, onToggleExisting, onAddFiles, onRemoveFile }: Props) {
  const [drafts, setDrafts] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setDrafts(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const total = retainedIds.length + files.length;

  return (
    <div className='mw-rent-photos'>
      {existing.length ? (
        <div className='mw-rent-photo-row'>
          {existing.map((photo) => {
            const kept = retainedIds.includes(photo.id);
            return (
              <div key={photo.id} className={`mw-rent-photo ${kept ? 'kept' : 'dropped'}`}>
                <img src={photo.url} alt='' loading='lazy' />
                <button
                  type='button'
                  onClick={() => onToggleExisting(photo.id)}
                  aria-pressed={!kept}
                  aria-label={kept ? (bn ? 'ছবি সরান' : 'Remove photo') : (bn ? 'ছবি রাখুন' : 'Keep photo')}
                >
                  {kept ? '×' : '↺'}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {files.length ? (
        <div className='mw-rent-photo-row'>
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className='mw-rent-photo kept'>
              <img src={drafts[index]} alt={file.name} />
              <button
                type='button'
                onClick={() => onRemoveFile(index)}
                aria-label={bn ? 'নতুন ছবি সরান' : 'Remove new photo'}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <input
        id='photos'
        type='file'
        accept='image/jpeg,image/png,image/webp'
        multiple
        disabled={total >= max}
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? []);
          if (picked.length) onAddFiles(picked);
          event.target.value = '';
        }}
      />
      <p className='mw-rent-photo-hint'>
        {bn
          ? `${total}/${max} ছবি নির্বাচিত। প্রতিটি ছবি JPG, PNG বা WEBP হতে হবে।`
          : `${total}/${max} photos selected. Each photo must be JPG, PNG or WEBP.`}
      </p>
      {error ? <span style={ERROR_STYLE}>{Array.isArray(error) ? error.join(' ') : error}</span> : null}
    </div>
  );
}
