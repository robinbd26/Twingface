'use client';

import { useState } from 'react';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { NETWORK_ERROR } from '@/lib/client/forms';

export default function FollowButton({
  username,
  initiallyFollowing,
}: {
  username: string;
  initiallyFollowing: boolean;
}) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const [following, setFollowing] = useState(initiallyFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError('');
    const response = await fetch(`/api/mediaworld/talent/${encodeURIComponent(username)}/follow`, {
      method: following ? 'DELETE' : 'POST',
    }).catch(() => null);
    setBusy(false);
    if (!response) {
      setError(bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en);
      return;
    }
    const data = await response.json().catch(() => null) as { following?: boolean; error?: string } | null;
    if (!response.ok || typeof data?.following !== 'boolean') {
      setError(data?.error || (bn ? 'ফলো করা যায়নি।' : 'Unable to update follow.'));
      return;
    }
    setFollowing(data.following);
  }

  return (
    <span className='mw-follow'>
      <button
        type='button'
        className={`mw-btn ${following ? 'mw-btn-following' : 'mw-btn-secondary'}`}
        aria-pressed={following}
        onClick={toggle}
        disabled={busy}
      >
        <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
          {following ? (
            <path d='m5 12.5 4.2 4.2L19 6.8' />
          ) : (
            <>
              <circle cx='9' cy='8' r='3.2' />
              <path d='M3.5 19c.7-3.2 2.9-5 5.5-5s4.8 1.8 5.5 5M17.5 8v6M14.5 11h6' />
            </>
          )}
        </svg>
        {busy
          ? (bn ? 'অপেক্ষা করুন…' : 'Please wait…')
          : following
            ? (bn ? 'ফলোইং' : 'Following')
            : (bn ? 'ফলো করুন' : 'Follow')}
      </button>
      {error ? <span className='mw-follow-error' role='alert'>{error}</span> : null}
    </span>
  );
}
