'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton({ variant = 'button' }: { variant?: 'button' | 'menu' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function logout() {
    if (loading) return;

    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('The sign-out request failed.');
      router.replace('/login');
    } catch {
      setError('Unable to sign out. Check your connection and try again.');
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  if (variant === 'menu') {
    return (
      <>
        <button
          type='button'
          role='menuitem'
          className='profile-menu-item'
          onClick={() => void logout()}
          disabled={loading}
          data-testid='menu-item-logout'
        >
          <span className='menu-icon'>
            <svg aria-hidden='true' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' /><path d='m16 17 5-5-5-5M21 12H9' /></svg>
          </span>
          <span>{loading ? 'Signing out…' : 'Log out'}</span>
        </button>
        {error ? <p className='logout-error' role='alert'>{error}</p> : null}
      </>
    );
  }

  return (
    <>
      <button className='btn' type='button' disabled={loading} onClick={() => void logout()}>
        <span>{loading ? 'Signing out…' : 'Log out'}</span>
        <span>→</span>
      </button>
      {error ? <p className='logout-error' role='alert'>{error}</p> : null}
    </>
  );
}
