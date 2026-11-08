'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import BdMap from '../bd-map';
import ThemeButton from '../theme-button';
import { resolveLoginError } from '@/lib/login-messages';

function Chip({
  img,
  init,
  bg,
  fg,
  name,
  sub,
  style,
}: {
  img: string;
  init: string;
  bg: string;
  fg: string;
  name: string;
  sub: string;
  style?: React.CSSProperties;
}) {
  const [err, setErr] = useState(false);
  return (
    <div className='chip' style={style}>
      <i style={{ background: bg, color: fg, overflow: 'hidden', padding: 0 }}>
        {!err ? (
          <img
            src={img}
            alt={name}
            width={32}
            height={32}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setErr(true)}
          />
        ) : (
          init
        )}
      </i>
      <div>
        <span>{name}</span>
        <small>{sub}</small>
      </div>
    </div>
  );
}

const EN: Record<string, string> = {
  loc: 'Dhaka, Bangladesh',
  rt: 'Your people are here',
  s1: 'A familiar name.',
  s2: 'An old story.',
  rh1: 'Let the pull of',
  rh2: 'your people bring you back.',
  c1i: 'R',
  c1n: 'Rima',
  c1s: 'Mirpur-10, Dhaka',
  c2i: 'S',
  c2n: 'Sajid',
  c2s: 'Dhaka · Friend',
  rb1: 'From Dhaka, to every corner of Bangladesh.',
  rb2: 'Same roots, a little closer.',
  leb: 'Your people are right here',
  lh: 'Come back to your people.',
  lede: 'Return to friends, family and everyone who makes it feel like home.',
  idl: 'Email or mobile number',
  idph: 'Your email or mobile',
  pwl: 'Password',
  pwph: 'Enter your password',
  rem: 'Remember me',
  badcred: 'Invalid email, phone, User ID, or password.',
  loginTimeout: 'Sign-in is taking too long. Check your connection and try again.',
  sign: 'Sign in',
  newto: 'New to Twingface?',
  open: 'Create an account',
  f1: 'With people, in your own language.',
  lok: '✓ Signed in (demo)',
};

const BN: Record<string, string> = {
  loc: 'ঢাকা, বাংলাদেশ',
  rt: 'এখানে আপনার মানুষ আছে',
  s1: 'একটা পরিচিত নাম।',
  s2: 'একটা পুরোনো গল্প।',
  rh1: 'ফিরে আসুক',
  rh2: 'আপনজনের টান।',
  c1i: 'র',
  c1n: 'রিমা',
  c1s: 'মিরপুর-১০, ঢাকা',
  c2i: 'স',
  c2n: 'সাজিদ',
  c2s: 'ঢাকা · বন্ধু',
  rb1: 'ঢাকা থেকে, বাংলাদেশের প্রতিটি ঠিকানায়।',
  rb2: 'একই শেকড়, আরও কাছাকাছি।',
  leb: 'আপনার আপনজনেরা এখানেই',
  lh: 'ফিরে আসুন আপনজনের কাছে।',
  lede: 'বন্ধু, পরিবার আর যাদের সঙ্গে ঘর-ঘর লাগে, তাদের কাছে ফিরুন।',
  idl: 'ইমেইল বা মোবাইল নম্বর',
  idph: 'আপনার ইমেইল বা মোবাইল',
  pwl: 'পাসওয়ার্ড',
  pwph: 'আপনার পাসওয়ার্ড লিখুন',
  rem: 'আমাকে মনে রাখুন',
  badcred: 'ইমেইল, ফোন, ইউজার আইডি বা পাসওয়ার্ড সঠিক নয়।',
  loginTimeout: 'সাইন ইন করতে বেশি সময় লাগছে। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।',
  sign: 'সাইন ইন করুন',
  newto: 'টুইংফেসে নতুন?',
  open: 'অ্যাকাউন্ট খুলুন',
  f1: 'মানুষের সঙ্গে, নিজের ভাষায়।',
  lok: '✓ সাইন ইন সফল (ডেমো)',
};

const LOGIN_TIMEOUT_MS = 15_000;

export default function LoginForm() {
  const [L, setL] = useState<'en' | 'bn'>('en');
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const t = (k: string) => (L === 'bn' ? BN[k] ?? EN[k] : EN[k]);

  useEffect(() => {
    try {
      if (localStorage.getItem('tf-lang') === 'bn') setL('bn');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = L;
    try {
      localStorage.setItem('tf-lang', L);
    } catch {
      /* ignore */
    }
  }, [L]);

  async function submitLog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setMsg('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(resolveLoginError(body?.error, t('badcred')));
      window.location.assign(body?.user?.role === 'SUPER_ADMIN' ? '/super_admin' : '/dashboard');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') setMsg(t('loginTimeout'));
      else setMsg(error instanceof Error ? error.message : t('badcred'));
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <div className={L === 'bn' ? 'auth bn' : 'auth'}>
      <div className='shell'>
        <section className='hero'>
          <Link className='logo' href='/'>
            <i></i>twing<b>face</b>
          </Link>
          <div className='hrow'>
            <span>
              <span className='dot'></span>&nbsp; <span className='eyebrow'>{t('rt')}</span>
            </span>
            <span>01 / BD</span>
          </div>
          <p className='lead' style={{ marginTop: 22 }}>
            <span>{t('s1')}</span> <span>{t('s2')}</span>
          </p>
          <h2>
            <span>{t('rh1')}</span>
            <br />
            <em>{t('rh2')}</em>
          </h2>
          <div className='mapwrap'>
            <div className='bdmap'>
              <BdMap gid='lg-login' />
            </div>
            <Chip
              img='/rima.jpg'
              init={t('c1i')}
              bg='#f7d6cf'
              fg='#c4503c'
              name={t('c1n')}
              sub={t('c1s')}
              style={{ left: 0, top: '8%' }}
            />
            <Chip
              img='/sajid.jpg'
              init={t('c2i')}
              bg='#d6ece1'
              fg='#2d6a58'
              name={t('c2n')}
              sub={t('c2s')}
              style={{ right: 0, bottom: '12%', animationDelay: '1.5s' }}
            />
          </div>
          <div className='hfoot'>
            <b>{t('rb1')}</b>
            <hr />
            <span>{t('rb2')}</span>
          </div>
        </section>
        <main className='panel'>
          <div className='top'>
            <Link className='logo' href='/'>
              <i></i>twing<b>face</b>
            </Link>
            <div className='made'>
              <span className='dot'></span>
              <span>{t('loc')}</span>
            </div>
            <div className='lang'>
              <button type='button' className={L === 'en' ? 'on' : ''} onClick={() => setL('en')}>
                English
              </button>
              <button type='button' className={L === 'bn' ? 'on' : ''} onClick={() => setL('bn')}>
                বাংলা
              </button>
            </div>
            <ThemeButton />
          </div>
          <div className='card'>
            <div className='pill'>
              <b>👋</b>
              <span>{t('leb')}</span>
            </div>
            <h1 style={{ marginTop: 18 }}>{t('lh')}</h1>
            <p className='sub'>{t('lede')}</p>
            <form onSubmit={submitLog}>
              <label className='l' htmlFor='log-id'>
                {t('idl')}
              </label>
              <div className='f'>
                <i>✉️</i>
                <input
                  id='log-id'
                  type='text'
                  required
                  autoComplete='username'
                  placeholder={t('idph')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <label className='l' htmlFor='log-pw'>
                {t('pwl')}
              </label>
              <div className='f'>
                <i>🔒</i>
                <input
                  id='log-pw'
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete='current-password'
                  placeholder={t('pwph')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type='button'
                  onClick={() => setShowPw((v) => !v)}
                  aria-label='Show password'
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
              <div className='row2'>
                <label>
                  <input type='checkbox' />
                  <span>{t('rem')}</span>
                </label>
              </div>
              <button className='btn' disabled={loading}>
                <span>{loading ? 'Signing in…' : t('sign')}</span>
                <span>→</span>
              </button>
              <div className='msg'>{msg}</div>
            </form>
            <p className='foot'>
              <span>{t('newto')}</span>{' '}
              <Link className='link' href='/register'>
                {t('open')}
              </Link>
            </p>
          </div>
          <div className='pfoot'>
            <span>{t('f1')}</span>
            <b>twingface.com</b>
          </div>
        </main>
      </div>
    </div>
  );
}
