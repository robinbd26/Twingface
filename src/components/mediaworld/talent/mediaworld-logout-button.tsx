'use client';

import { useState } from 'react';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';

export default function MediaWorldLogoutButton({
  className = 'mw-btn mw-btn-secondary',
  redirectTo = '/mediaworld',
}: {
  /** Surfaces outside the talent profile pass their own button class. */
  className?: string;
  /** Where the browser goes once the session cookie is gone. */
  redirectTo?: string;
} = {}) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function logout() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('The sign-out request failed.');
      window.location.assign(redirectTo);
    } catch {
      setError(bn ? 'লগ আউট করা যায়নি। আবার চেষ্টা করুন।' : 'Unable to log out. Please try again.');
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type='button'
        className={className}
        onClick={() => void logout()}
        disabled={busy}
        data-testid='mediaworld-logout'
      >
        {busy ? (bn ? 'লগ আউট হচ্ছে…' : 'Signing out…') : (bn ? 'লগ আউট' : 'Log out')}
      </button>
      {error ? <p className='mw-follow-error' role='alert' style={{ flexBasis: '100%' }}>{error}</p> : null}
    </>
  );
}
