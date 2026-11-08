'use client';

import { useEffect, useState } from 'react';
import { ERROR_STYLE, LABEL_STYLE, errorText } from '@/lib/client/forms';

export function LogoPicker({
  id,
  label,
  bn,
  logoUrl,
  file,
  error,
  onSelect,
}: {
  id: string;
  label: string;
  bn: boolean;
  logoUrl: string | null;
  file: File | null;
  error: string | string[] | undefined;
  onSelect: (file: File | null) => void;
}) {
  const [draftUrl, setDraftUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setDraftUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setDraftUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewUrl = draftUrl ?? logoUrl;

  return (
    <div style={{ marginBottom: 16 }}>
      <span style={LABEL_STYLE}>{label}</span>
      <div className='mw-onb-logo'>
        {previewUrl ? <img src={previewUrl} alt='' /> : <span className='mw-onb-logo-empty'>{bn ? 'লোগো' : 'Logo'}</span>}
        <div>
          <input
            id={id}
            type='file'
            accept='image/jpeg,image/png,image/webp,image/gif'
            onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
          />
          {file && logoUrl ? (
            <button type='button' className='mw-onb-logo-clear' onClick={() => onSelect(null)}>
              {bn ? 'নতুন ফাইল সরান' : 'Remove new file'}
            </button>
          ) : null}
        </div>
      </div>
      {errorText(error) ? <span style={ERROR_STYLE}>{errorText(error)}</span> : null}
    </div>
  );
}
