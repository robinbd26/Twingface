'use client';

import { useEffect, useRef, useState } from 'react';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { mediaWorldPostLoginPath } from '@/lib/mediaworld/post-login';

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function AILoginModal({ open, onClose }: LoginModalProps) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);

  // Split from the Escape effect on purpose: the hosts pass an inline `onClose`,
  // so re-running the focus work on every parent render would steal focus mid-typing.
  useEffect(() => {
    if (!open) return;
    const returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    emailRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      if (returnFocusTo && document.contains(returnFocusTo)) returnFocusTo.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Login failed.');
        return;
      }
      window.location.assign(mediaWorldPostLoginPath(data.user));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className='login-backdrop'
      role='presentation'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className='login-modal' role='dialog' aria-modal='true' aria-labelledby='mw-login-modal-title'>
        <div className='login-head'>
          <h2 className='title' id='mw-login-modal-title'>{bn ? 'মিডিয়া ওয়ার্ল্ড লগ ইন' : 'Media World Login'}</h2>
          <p className='hint'>{bn ? 'আপনার ID বা ইমেইল এবং পাসওয়ার্ড দিয়ে লগ ইন করুন' : 'Sign in with your ID or email and password'}</p>
          <button
            type='button'
            className='close'
            onClick={onClose}
            aria-label={bn ? 'বন্ধ করুন' : 'Close'}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className='login-body'>
          <label className='field'>
            <span className='label-text'>{bn ? 'ইমেইল বা ইউজার আইডি' : 'Email or User ID'}</span>
            <input
              ref={emailRef}
              type='text'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={bn ? 'আপনার ইমেইল বা আইডি' : 'you@example.com'}
              autoComplete='username'
              className={error ? 'field-error' : ''}
            />
          </label>

          <label className='field'>
            <span className='label-text'>{bn ? 'পাসওয়ার্ড' : 'Password'}</span>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={bn ? 'আপনার পাসওয়ার্ড' : 'Your password'}
              autoComplete='current-password'
              className={error ? 'field-error' : ''}
            />
          </label>

          {error ? <div className='login-error'>{error}</div> : null}

          <button type='submit' className='login-btn' disabled={loading}>
            {loading ? (bn ? 'লগ ইন করা হচ্ছে…' : 'Signing in…') : (bn ? 'লগ ইন করুন' : 'Sign in')}
          </button>

          <div className='login-foot'>
            <button
              type='button'
              className='login-link'
              disabled={loading}
              data-testid='mw-login-register'
              onClick={() => {
                // Full document load: a tab left open across a rebuild navigates on stale
                // client chunks and leaves the visitor inside this form.
                window.location.assign('/mediaworld/register');
              }}
            >
              {bn ? 'নতুন অ্যাকাউন্ট খুলুন' : 'Create an account'}
            </button>
            <button
              type='button'
              className='login-back'
              data-testid='mw-login-back'
              onClick={onClose}
            >
              {bn ? '← পেছনে ফিরুন' : '← Back'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}