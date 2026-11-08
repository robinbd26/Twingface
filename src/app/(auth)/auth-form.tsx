
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import BdMap from './bd-map';
import ThemeButton from './theme-button';
import { validateContact } from '@/lib/validations';
import { createStrongPassword, createSuggestedUserId } from '@/lib/user-id';
import { resolveLoginError } from '@/lib/login-messages';
import { districtsForDivision, DIVISIONS, GENDERS, MIN_DOB_YEAR, MONTHS } from '@/lib/constants';

type Lang = 'en' | 'bn';

const CURRENT_YEAR = new Date().getFullYear();
const LOGIN_TIMEOUT_MS = 15_000;
const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const BN_GENDERS: Record<string, string> = { Male: 'পুরুষ', Female: 'মহিলা', Others: 'অন্য' };

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

function AuthPw({
  id,
  placeholder,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  placeholder: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className='f'>
      <i>🔒</i>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        required
        minLength={8}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type='button'
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? '🙈' : '👁'}
      </button>
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
  idl: 'Email, phone, or User ID',
  idph: 'Your email, phone, or User ID',
  pwl: 'Password',
  pwph: 'Enter your password',
  rem: 'Remember me',
  badcred: 'Invalid email, phone, User ID, or password.',
  loginTimeout: 'Sign-in is taking too long. Check your connection and try again.',
  sign: 'Sign in',
  signing: 'Signing in…',
  newto: 'New to Twingface?',
  open: 'Create an account',
  rpill: 'Join Twingface in under a minute',
  rtitle: 'Create your account',
  rsub: "A few details and you're on your way.",
  rname: 'Full Name',
  rnameph: 'e.g. Farah Rahman',
  rusername: 'User ID',
  rusernameph: 'e.g. farah.rahman',
  rusernamehelp: '3–30 lowercase letters, numbers, dots, underscores, or hyphens.',
  rcont: 'Email or Bangladeshi Mobile',
  rcontph: '+880 1XXX-XXXXXX or you@example.com',
  rpw: 'Password',
  rpwph: 'At least 8 characters',
  rcpw: 'Confirm Password',
  rcpwph: 'Type your password again',
  match: '✓ Passwords match',
  mismatch: '✕ Passwords do not match',
  rterms: "I agree to Twingface's Terms and Privacy Notice.",
  rsign: 'Create my account',
  rcreating: 'Creating your account…',
  rfoot1: 'Already have an account?',
  rfoot2: 'Log in',
  rok: '✓ Account created! Taking you to your dashboard…',
  rfail: 'Could not create your account. Please try again.',
  fix: 'Please correct the highlighted fields.',
  eName: 'Please enter your name (min 2 characters).',
  eUsername: 'Choose a valid User ID (3–30 letters, numbers, dots, underscores, or hyphens).',
  eContact: 'Enter a valid email or BD mobile (01XXXXXXXXX).',
  ePw: 'Password must be at least 8 characters.',
  ePwCase: 'Include upper and lowercase letters.',
  ePwNum: 'Include at least one number.',
  eTerms: 'Please accept the Terms and Privacy Notice.',
  eGender: 'Please select your gender.',
  eDob: 'Please select your date of birth.',
  eDiv: 'Please select your division.',
  eDis: 'Please select your district.',
  eDisMatch: 'District does not match the selected division.',
  rgender: 'Gender',
  rgenderph: 'Select gender',
  rdob: 'Date of Birth',
  rday: 'Day',
  rmonth: 'Month',
  ryear: 'Year',
  rdiv: 'Division',
  rdivph: 'Select division',
  rdis: 'District',
  rdisph: 'Select district',
  rdisfirst: 'Select a division first',
  f1: 'With people, in your own language.',
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
  idl: 'ইমেইল, ফোন বা ইউজার আইডি',
  idph: 'আপনার ইমেইল, ফোন বা ইউজার আইডি',
  pwl: 'পাসওয়ার্ড',
  pwph: 'আপনার পাসওয়ার্ড লিখুন',
  rem: 'আমাকে মনে রাখুন',
  badcred: 'ইমেইল, ফোন, ইউজার আইডি বা পাসওয়ার্ড সঠিক নয়।',
  loginTimeout: 'সাইন ইন করতে বেশি সময় লাগছে। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।',
  sign: 'সাইন ইন করুন',
  signing: 'সাইন ইন হচ্ছে…',
  newto: 'টুইংফেসে নতুন?',
  open: 'অ্যাকাউন্ট খুলুন',
  rpill: 'এক মিনিটেই Twingface-এ যোগ দিন',
  rtitle: 'চলুন, পরিচয়টা শুরু হোক',
  rsub: 'কয়েকটা তথ্য দিন, আপনি তৈরি।',
  rname: 'আপনার নাম',
  rnameph: 'যেমন: ফারাহ রহমান',
  rusername: 'ইউজার আইডি',
  rusernameph: 'যেমন: farah.rahman',
  rusernamehelp: '৩–৩০টি ছোট হাতের অক্ষর, সংখ্যা, ডট, আন্ডারস্কোর বা হাইফেন ব্যবহার করুন।',
  rcont: 'মোবাইল নম্বর বা ইমেইল',
  rcontph: '+880 1XXX-XXXXXX অথবা you@example.com',
  rpw: 'পাসওয়ার্ড',
  rpwph: 'কমপক্ষে ৮টি অক্ষর',
  rcpw: 'পাসওয়ার্ড আবার লিখুন',
  rcpwph: 'পাসওয়ার্ডটি আবার লিখুন',
  match: '✓ পাসওয়ার্ড মিলেছে',
  mismatch: '✕ পাসওয়ার্ড মিলছে না',
  rterms: 'আমি Twingface-এর শর্তাবলী ও প্রাইভেসি নোটিসে সম্মত।',
  rsign: 'অ্যাকাউন্ট তৈরি করুন',
  rcreating: 'অ্যাকাউন্ট তৈরি হচ্ছে…',
  rfoot1: 'ইতিমধ্যেই অ্যাকাউন্ট আছে?',
  rfoot2: 'লগইন করুন',
  rok: '✓ অ্যাকাউন্ট তৈরি হয়েছে! ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে…',
  rfail: 'অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।',
  fix: 'হাইলাইট করা ঘরগুলো ঠিক করুন।',
  eName: 'আপনার নাম দিন (কমপক্ষে ২ অক্ষর)।',
  eUsername: 'সঠিক ইউজার আইডি দিন (৩–৩০টি অক্ষর, সংখ্যা, ডট, আন্ডারস্কোর বা হাইফেন)।',
  eContact: 'সঠিক ইমেইল বা বাংলাদেশি মোবাইল দিন (01XXXXXXXXX)।',
  ePw: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।',
  ePwCase: 'বড় ও ছোট হাতের অক্ষর রাখুন।',
  ePwNum: 'কমপক্ষে একটি সংখ্যা রাখুন।',
  eTerms: 'অনুগ্রহ করে শর্তাবলী ও প্রাইভেসি নোটিসে সম্মত হন।',
  eGender: 'আপনার লিঙ্গ নির্বাচন করুন।',
  eDob: 'আপনার জন্ম তারিখ নির্বাচন করুন।',
  eDiv: 'আপনার বিভাগ নির্বাচন করুন।',
  eDis: 'আপনার জেলা নির্বাচন করুন।',
  eDisMatch: 'জেলাটি নির্বাচিত বিভাগের সাথে মেলেনি।',
  rgender: 'লিঙ্গ',
  rgenderph: 'লিঙ্গ নির্বাচন করুন',
  rdob: 'জন্ম তারিখ',
  rday: 'দিন',
  rmonth: 'মাস',
  ryear: 'বছর',
  rdiv: 'বিভাগ',
  rdivph: 'বিভাগ নির্বাচন করুন',
  rdis: 'জেলা',
  rdisph: 'জেলা নির্বাচন করুন',
  rdisfirst: 'আগে একটি বিভাগ নির্বাচন করুন',
  f1: 'মানুষের সঙ্গে, নিজের ভাষায়।',
};

export default function AuthForm({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [L, setL] = useState<Lang>('bn');
  // login
  const [showPw, setShowPw] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  // register
  const [rName, setRName] = useState('');
  const [rUsername, setRUsername] = useState(() => createSuggestedUserId(''));
  const [rContact, setRContact] = useState('');
  const [rGender, setRGender] = useState('');
  const [rDobDay, setRDobDay] = useState('');
  const [rDobMonth, setRDobMonth] = useState('');
  const [rDobYear, setRDobYear] = useState('');
  const [rDivision, setRDivision] = useState('');
  const [rDistrict, setRDistrict] = useState('');
  const [rPw, setRPw] = useState('');
  const [rCpw, setRCpw] = useState('');
  const [terms, setTerms] = useState(false);
  const [rErrors, setRErrors] = useState<Record<string, string>>({});
  const [rLoading, setRLoading] = useState(false);
  const [rMsg, setRMsg] = useState('');

  const districts = useMemo(() => districtsForDivision(rDivision), [rDivision]);

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

  useEffect(() => {
    setRUsername(createSuggestedUserId(rName));
  }, [rName]);

  const passwordMatch = rPw && rCpw ? rPw === rCpw : null;

  function switchMode(login: boolean) {
    setIsLogin(login);
    setMsg('');
    setRMsg('');
    setRErrors({});
  }

  async function submitLog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(resolveLoginError(body?.error, t('badcred')));
      }
      window.location.assign(body?.user?.role === 'SUPER_ADMIN' ? '/super_admin' : '/dashboard');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') setMsg(t('loginTimeout'));
      else setMsg(error instanceof Error ? error.message : t('badcred'));
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  function validateReg() {
    const e: Record<string, string> = {};
    if (rName.trim().length < 2) e.name = t('eName');
    if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(rUsername.trim().toLowerCase()) || rUsername.trim().length < 3 || rUsername.trim().length > 30) e.username = t('eUsername');
    if (!validateContact(rContact)) e.contact = t('eContact');
    if (!rGender) e.gender = t('eGender');
    if (!rDobDay || !rDobMonth || !rDobYear) {
      e.dob = t('eDob');
    } else {
      const d = new Date(Number(rDobYear), Number(rDobMonth) - 1, Number(rDobDay));
      const validDate =
        d.getFullYear() === Number(rDobYear) &&
        d.getMonth() === Number(rDobMonth) - 1 &&
        d.getDate() === Number(rDobDay);
      const age = (Date.now() - d.getTime()) / 31557600000;
      if (!validDate || age < 0 || age < 13) e.dob = t('eDob');
    }
    if (!rDivision) e.division = t('eDiv');
    else if (!rDistrict) e.district = t('eDis');
    else if (!(districts as readonly string[]).includes(rDistrict)) e.district = t('eDisMatch');
    if (rPw.length < 8) e.pw = t('ePw');
    else if (!/[a-z]/.test(rPw) || !/[A-Z]/.test(rPw)) e.pw = t('ePwCase');
    else if (!/\d/.test(rPw)) e.pw = t('ePwNum');
    if (rPw !== rCpw) e.cpw = t('mismatch');
    if (!terms) e.terms = t('eTerms');
    return e;
  }

  async function submitReg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = validateReg();
    setRErrors(v);
    if (Object.keys(v).length > 0) {
      setRMsg(t('fix'));
      return;
    }
    setRMsg('');
    setRLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rName.trim(),
          username: rUsername.trim(),
          contact: rContact.trim(),
          gender: rGender,
          dobDay: rDobDay ? Number(rDobDay) : undefined,
          dobMonth: rDobMonth ? Number(rDobMonth) : undefined,
          dobYear: rDobYear ? Number(rDobYear) : undefined,
          division: rDivision,
          district: rDistrict,
          password: rPw,
          confirmPassword: rCpw,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, string[]>;
      };
      if (!res.ok) {
        const mapped: Record<string, string> = {};
        for (const [field, messages] of Object.entries(data.fields ?? {})) {
          const message = Array.isArray(messages) ? messages[0] : undefined;
          if (!message) continue;
          if (field === 'name') mapped.name = message;
          else if (field === 'username') mapped.username = message;
          else if (field === 'contact') mapped.contact = message;
          else if (field === 'gender') mapped.gender = message;
          else if (field === 'dobDay' || field === 'dobMonth' || field === 'dobYear') mapped.dob = message;
          else if (field === 'division') mapped.division = message;
          else if (field === 'district') mapped.district = message;
          else if (field === 'password') mapped.pw = message;
          else if (field === 'confirmPassword') mapped.cpw = message;
        }
        setRErrors(mapped);
        setRMsg(data.error || t('rfail'));
        return;
      }
      setRMsg(t('rok'));
      window.setTimeout(() => window.location.assign('/dashboard'), 1200);
    } catch {
      setRMsg(t('rfail'));
    } finally {
      setRLoading(false);
    }
  }
;

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
              <BdMap gid='lg-auth' />
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
            <div key={isLogin ? 'login' : 'register'} className='swap'>
              {isLogin ? (
                <>
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
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
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
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? '🙈' : '👁'}
                      </button>
                    </div>
                    <div className='row2'>
                      <label>
                        <input
                          type='checkbox'
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                        />
                        <span>{t('rem')}</span>
                      </label>
                    </div>
                    <button className='btn' disabled={loading}>
                      <span>{loading ? t('signing') : t('sign')}</span>
                      <span>→</span>
                    </button>
                    <div className={msg ? 'msg err' : 'msg'}>{msg}</div>
                  </form>
                  <p className='foot'>
                    <span>{t('newto')}</span>{' '}
                    <button type='button' className='link' onClick={() => switchMode(false)}>
                      {t('open')}
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <div className='pill'>
                    <b>✨</b>
                    <span>{t('rpill')}</span>
                  </div>
                  <h1 style={{ marginTop: 18 }}>{t('rtitle')}</h1>
                  <p className='sub'>{t('rsub')}</p>
                  <form onSubmit={submitReg} noValidate>
                    <label className='l' htmlFor='ra-name'>
                      {t('rname')}
                    </label>
                    <div className='f'>
                      <i>👤</i>
                      <input
                        id='ra-name'
                        type='text'
                        required
                        autoComplete='name'
                        placeholder={t('rnameph')}
                        value={rName}
                        onChange={(e) => setRName(e.target.value)}
                        aria-invalid={Boolean(rErrors.name)}
                      />
                    </div>
                    {rErrors.name ? (
                      <p className='hint err' role='alert'>
                        {rErrors.name}
                      </p>
                    ) : null}

                    <label className='l' htmlFor='ra-username'>
                      {t('rusername')}
                    </label>
                    <div className='f'>
                      <i>@</i>
                      <input
                        id='ra-username'
                        type='text'
                        required
                        autoComplete='username'
                        placeholder={t('rusernameph')}
                        value={rUsername}
                        readOnly
                        aria-describedby='ra-username-help'
                        aria-invalid={Boolean(rErrors.username)}
                      />
                    </div>
                    <p id='ra-username-help' className='hint'>
                      {t('rusernamehelp')}
                    </p>
                    {rErrors.username ? (
                      <p className='hint err' role='alert'>
                        {rErrors.username}
                      </p>
                    ) : null}

                    <label className='l' htmlFor='ra-contact'>
                      {t('rcont')}
                    </label>
                    <div className='f'>
                      <i>✉️</i>
                      <input
                        id='ra-contact'
                        type='text'
                        required
                        autoComplete='email'
                        placeholder={t('rcontph')}
                        value={rContact}
                        onChange={(e) => setRContact(e.target.value)}
                        aria-invalid={Boolean(rErrors.contact)}
                      />
                    </div>
                    {rErrors.contact ? (
                      <p className='hint err' role='alert'>
                        {rErrors.contact}
                      </p>
                    ) : null}

                    <label className='l' htmlFor='ra-gender'>
                      {t('rgender')}
                    </label>
                    <div className='sel'>
                      <select
                        id='ra-gender'
                        required
                        value={rGender}
                        onChange={(e) => setRGender(e.target.value)}
                        aria-invalid={Boolean(rErrors.gender)}
                      >
                        <option value=''>{t('rgenderph')}</option>
                        {GENDERS.map((g) => (
                          <option key={g} value={g}>
                            {L === 'bn' ? BN_GENDERS[g] : g}
                          </option>
                        ))}
                      </select>
                    </div>
                    {rErrors.gender ? (
                      <p className='hint err' role='alert'>
                        {rErrors.gender}
                      </p>
                    ) : null}

                    <label className='l'>{t('rdob')}</label>
                    <div className='g3'>
                      <div className='sel'>
                        <select
                          aria-label={t('rday')}
                          value={rDobDay}
                          onChange={(e) => setRDobDay(e.target.value)}
                          aria-invalid={Boolean(rErrors.dob)}
                        >
                          <option value=''>{t('rday')}</option>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className='sel'>
                        <select
                          aria-label={t('rmonth')}
                          value={rDobMonth}
                          onChange={(e) => setRDobMonth(e.target.value)}
                          aria-invalid={Boolean(rErrors.dob)}
                        >
                          <option value=''>{t('rmonth')}</option>
                          {MONTHS.map((m, i) => (
                            <option key={m} value={i + 1}>
                              {L === 'bn' ? BN_MONTHS[i] : m}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className='sel'>
                        <select
                          aria-label={t('ryear')}
                          value={rDobYear}
                          onChange={(e) => setRDobYear(e.target.value)}
                          aria-invalid={Boolean(rErrors.dob)}
                        >
                          <option value=''>{t('ryear')}</option>
                          {Array.from({ length: CURRENT_YEAR - MIN_DOB_YEAR + 1 }, (_, i) => CURRENT_YEAR - i).map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {rErrors.dob ? (
                      <p className='hint err' role='alert'>
                        {rErrors.dob}
                      </p>
                    ) : null}

                    <div className='g2'>
                      <div>
                        <label className='l' htmlFor='ra-division'>
                          {t('rdiv')}
                        </label>
                        <div className='sel'>
                          <select
                            id='ra-division'
                            required
                            value={rDivision}
                            onChange={(e) => {
                              setRDivision(e.target.value);
                              setRDistrict('');
                            }}
                            aria-invalid={Boolean(rErrors.division)}
                          >
                            <option value=''>{t('rdivph')}</option>
                            {DIVISIONS.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                        {rErrors.division ? (
                          <p className='hint err' role='alert'>
                            {rErrors.division}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <label className='l' htmlFor='ra-district'>
                          {t('rdis')}
                        </label>
                        <div className='sel'>
                          <select
                            id='ra-district'
                            required
                            value={rDistrict}
                            onChange={(e) => setRDistrict(e.target.value)}
                            disabled={!rDivision}
                            aria-invalid={Boolean(rErrors.district)}
                          >
                            <option value=''>{rDivision ? t('rdisph') : t('rdisfirst')}</option>
                            {districts.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                        {rErrors.district ? (
                          <p className='hint err' role='alert'>
                            {rErrors.district}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <label className='l' htmlFor='ra-pw'>
                      {t('rpw')}
                    </label>
                    <AuthPw
                      id='ra-pw'
                      placeholder={t('rpwph')}
                      autoComplete='new-password'
                      value={rPw}
                      onChange={setRPw}
                    />
                    <button type='button' className='link' onClick={() => { const suggestedPassword = createStrongPassword(); setRPw(suggestedPassword); setRCpw(suggestedPassword); }}>Suggest strong password</button>
                    {rErrors.pw ? (
                      <p className='hint err' role='alert'>
                        {rErrors.pw}
                      </p>
                    ) : null}

                    <label className='l' htmlFor='ra-cpw'>
                      {t('rcpw')}
                    </label>
                    <AuthPw
                      id='ra-cpw'
                      placeholder={t('rcpwph')}
                      autoComplete='new-password'
                      value={rCpw}
                      onChange={setRCpw}
                    />
                    {rErrors.cpw ? (
                      <p className='hint err' role='alert'>
                        {rErrors.cpw}
                      </p>
                    ) : null}
                    {passwordMatch === false && !rErrors.cpw ? (
                      <p className='hint err'>{t('mismatch')}</p>
                    ) : null}
                    {passwordMatch === true ? (
                      <p className='hint' style={{ color: 'var(--acc)' }}>
                        {t('match')}
                      </p>
                    ) : null}

                    <label className='chk'>
                      <input
                        type='checkbox'
                        checked={terms}
                        onChange={(e) => setTerms(e.target.checked)}
                      />
                      <span>{t('rterms')}</span>
                    </label>
                    {rErrors.terms ? (
                      <p className='hint err' role='alert'>
                        {rErrors.terms}
                      </p>
                    ) : null}

                    <button className='btn' disabled={rLoading}>
                      <span>{rLoading ? t('rcreating') : t('rsign')}</span>
                      <span>→</span>
                    </button>
                    <div className={rMsg.startsWith('✓') ? 'msg' : 'msg err'}>{rMsg}</div>
                  </form>
                  <p className='foot'>
                    <span>{t('rfoot1')}</span>{' '}
                    <button type='button' className='link' onClick={() => switchMode(true)}>
                      {t('rfoot2')}
                    </button>
                  </p>
                </>
              )}
            </div>
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
