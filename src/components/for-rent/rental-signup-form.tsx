'use client';

import { useState } from 'react';
import Link from 'next/link';
import { districtsForDivision, DIVISIONS } from '@/lib/constants';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import AILoginModal from '@/components/mediaworld/ai-login-modal';
import { FormAlert } from '@/components/ui/form-field';
import { LogoPicker } from '@/components/mediaworld/onboarding/form-field';
import { generateStrongPassword } from '@/lib/client/strong-password';
import {
  INPUT_CLASS,
  LABEL_STYLE,
  NETWORK_ERROR,
  errorText,
  readError,
  readFieldErrors,
  sendForm,
  type FieldErrors,
} from '@/lib/client/forms';
import type { TaxonomySnapshot } from '@/lib/mediaworld/taxonomy';
import { nodeName } from '@/lib/mediaworld/labels';

type RentalPersonalDraft = {
  name: string;
  email: string;
  phone: string;
  division: string;
  district: string;
  presentAddress: string;
};

type RentalServiceDraft = {
  ownerName: string;
  businessName: string;
  location: string;
  fullAddress: string;
  description: string;
};

const EMPTY_PERSONAL: RentalPersonalDraft = {
  name: '',
  email: '',
  phone: '',
  division: '',
  district: '',
  presentAddress: '',
};

const EMPTY_SERVICE: RentalServiceDraft = {
  ownerName: '',
  businessName: '',
  location: '',
  fullAddress: '',
  description: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BD_MOBILE_RE = /^(\+?8801[3-9]\d{8}|01[3-9]\d{8})$/;

const FIELD_IDS: Record<string, string> = {
  name: 'mw-rent-name',
  email: 'mw-rent-email',
  phone: 'mw-rent-phone',
  password: 'mw-rent-password',
  confirmPassword: 'mw-rent-confirm',
  division: 'mw-rent-division',
  district: 'mw-rent-district',
  presentAddress: 'mw-rent-address',
  ownerName: 'mw-rent-owner',
  businessName: 'mw-rent-business',
  location: 'mw-rent-location',
  fullAddress: 'mw-rent-full-address',
  description: 'mw-rent-description',
  logo: 'mw-rent-logo',
};

function focusField(key: string) {
  const id = FIELD_IDS[key];
  if (id) document.getElementById(id)?.focus();
}

const TEXT = {
  en: {
    signedOutLead: 'Open a For Rent account with your details and your rental service in one form. No Film, Natok, TVC or Music designation is needed.',
    signedInLead: 'The account type is chosen when an account is opened — this form opens a For Rent provider account.',
    personalTitle: 'Your account details',
    personalLead: 'These create your login. You can sign in later with either your email or mobile number.',
    fullName: 'Full name',
    email: 'Email address',
    phone: 'Mobile number',
    password: 'Password',
    confirm: 'Confirm password',
    division: 'Division',
    district: 'District (Zila)',
    presentAddress: 'Present address',
    selectDivision: 'Select division',
    selectDistrict: 'Select district',
    selectDistrictFirst: 'Select a division first',
    addressPlaceholder: 'House, road, area, upazila…',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    suggestPassword: 'Suggest a strong password',
    suggestedNote: 'A random strong password is filled in and shown below — keep it somewhere safe before you continue.',
    serviceTitle: 'Your rental service',
    serviceLead: 'Buyers see this provider profile before they contact you.',
    ownerName: 'Owner or contact person',
    businessName: 'Rental business name (optional)',
    location: 'Service location',
    fullAddress: 'Full address (optional)',
    description: 'Service description',
    descriptionHint: 'What you rent out, condition and terms (at least 10 characters).',
    logoLabel: 'Profile photo or logo (optional)',
    categoriesTitle: 'What you can rent out',
    categoriesNote: 'Once the account is open you can create and manage your own rental listings.',
    submit: 'Create my For Rent account',
    submitting: 'Creating…',
    nameError: 'Enter your full name.',
    emailError: 'Enter a valid email address.',
    phoneError: 'Enter a valid Bangladeshi mobile number.',
    passwordError: 'Use at least 8 characters with upper case, lower case and a number.',
    passwordMismatch: 'Passwords do not match.',
    divisionError: 'Select your division.',
    districtError: 'Select your district.',
    addressError: 'Enter an address of at least 5 characters.',
    ownerError: 'Enter the owner or contact person name.',
    locationError: 'Enter your service location.',
    descriptionError: 'Describe your rental service in at least 10 characters.',
    formFallback: 'Unable to open your For Rent account.',
    success: 'For Rent account opened. Loading your rental dashboard…',
    loginTitle: 'Already have an account?',
    loginCopy: 'Sign in with your email, mobile number or User ID and continue with your rentals.',
    loginButton: 'Login',
    fullLoginPage: 'Full login page',
    mediaWorldCopy: 'Looking for crew, actors or musicians instead?',
    mediaWorldLink: 'Open a Media World profile',
    backToMediaWorld: '← Media World',
    memberRentTitle: 'This account is already a For Rent account',
    memberRentCopy: 'Its provider profile is saved, so there is nothing to register here.',
    memberRentCta: 'Go to rental dashboard',
    memberNoProviderCopy: 'This account is registered as For Rent but has no provider profile yet. Save it before publishing listings.',
    memberNoProviderCta: 'Open provider setup',
    memberProfileCta: 'Open my Media World profile',
    memberOtherTitle: 'This account is already registered',
    memberOtherCopy: 'Every account gets one Media World type and it cannot be switched from this page. Ask a Super Admin to change it.',
    memberOtherType: {
      PROFESSIONAL: 'Media World professional',
      BUSINESS: 'Business / organization',
      RENTAL: 'For Rent provider',
    } as Record<string, string>,
    memberOtherCta: 'This account is set up as',
  },
  bn: {
    signedOutLead: 'আপনার তথ্য আর আপনার ভাড়ার সার্ভিস — এক ফর্মেই ফর রেন্ট অ্যাকাউন্ট খুলুন। Film, Natok, TVC বা Music পেশা লাগবে না।',
    signedInLead: 'অ্যাকাউন্ট খোলার সময়ই টাইপ ঠিক হয় — এই ফরমটি ফর রেন্ট প্রোভাইডার অ্যাকাউন্ট খোলে।',
    personalTitle: 'আপনার অ্যাকাউন্টের তথ্য',
    personalLead: 'এটি আপনার লগইন তৈরি করবে। পরে ইমেইল বা মোবাইল নম্বর — যেকোনোটি দিয়ে সাইন ইন করতে পারবেন।',
    fullName: 'পূর্ণ নাম',
    email: 'ইমেইল ঠিকানা',
    phone: 'মোবাইল নম্বর',
    password: 'পাসওয়ার্ড',
    confirm: 'পাসওয়ার্ড নিশ্চিত করুন',
    division: 'বিভাগ',
    district: 'জেলা',
    presentAddress: 'বর্তমান ঠিকানা',
    selectDivision: 'বিভাগ নির্বাচন করুন',
    selectDistrict: 'জেলা নির্বাচন করুন',
    selectDistrictFirst: 'আগে বিভাগ নির্বাচন করুন',
    addressPlaceholder: 'বাড়ি, রাস্তা, এলাকা, উপজেলা…',
    showPassword: 'পাসওয়ার্ড দেখান',
    hidePassword: 'পাসওয়ার্ড লুকান',
    suggestPassword: 'একটি শক্তিশালী পাসওয়ার্ড দিন',
    suggestedNote: 'নিচে এলোমেলো একটি শক্তিশালী পাসওয়ার্ড বসানো ও দেখানো হয়েছে — এগিয়ে যাওয়ার আগে নিরাপদ জায়গায় রাখুন।',
    serviceTitle: 'আপনার ভাড়ার সার্ভিস',
    serviceLead: 'ক্রেতারা যোগাযোগের আগে এই প্রোভাইডার প্রোফাইলই দেখবেন।',
    ownerName: 'মালিক / সম্পর্কিত ব্যক্তির নাম',
    businessName: 'ব্যবসার নাম (ঐচ্ছিক)',
    location: 'সার্ভিসের লোকেশন',
    fullAddress: 'পূর্ণ ঠিকানা (ঐচ্ছিক)',
    description: 'সার্ভিসের বিবরণ',
    descriptionHint: 'কী কী ভাড়া দেন, কন্ডিশন ও শর্ত লিখুন (কমপক্ষে ১০ অক্ষর)।',
    logoLabel: 'প্রোফাইল ছবি বা লোগো (ঐচ্ছিক)',
    categoriesTitle: 'আপনি যা ভাড়া দিতে পারেন',
    categoriesNote: 'অ্যাকাউন্ট খোলার পর আপনি নিজের রেন্টাল লিস্টিং তৈরি ও পরিচালনা করতে পারবেন।',
    submit: 'ফর রেন্ট অ্যাকাউন্ট খুলুন',
    submitting: 'তৈরি হচ্ছে…',
    nameError: 'আপনার পূর্ণ নাম লিখুন।',
    emailError: 'সঠিক ইমেইল ঠিকানা লিখুন।',
    phoneError: 'সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন।',
    passwordError: 'অন্তত ৮ অক্ষর, বড় ও ছোট হাতের অক্ষর এবং একটি সংখ্যা ব্যবহার করুন।',
    passwordMismatch: 'পাসওয়ার্ড মিলছে না।',
    divisionError: 'আপনার বিভাগ নির্বাচন করুন।',
    districtError: 'আপনার জেলা নির্বাচন করুন।',
    addressError: 'অন্তত ৫ অক্ষরের ঠিকানা লিখুন।',
    ownerError: 'মালিক বা সম্পর্কিত ব্যক্তির নাম লিখুন।',
    locationError: 'আপনার সার্ভিসের লোকেশন লিখুন।',
    descriptionError: 'কমপক্ষে ১০ অক্ষরে সার্ভিসের বিবরণ লিখুন।',
    formFallback: 'ফর রেন্ট অ্যাকাউন্ট খোলা যায়নি।',
    success: 'ফর রেন্ট অ্যাকাউন্ট খুলেছে। আপনার ভাড়া ড্যাশবোর্ড খোলা হচ্ছে…',
    loginTitle: 'আগে থেকেই অ্যাকাউন্ট আছে?',
    loginCopy: 'ইমেইল, মোবাইল নম্বর বা ইউজার আইডি দিয়ে লগ ইন করে আপনার ভাড়ার কাজ চালিয়ে যান।',
    loginButton: 'লগ ইন',
    fullLoginPage: 'পূর্ণ লগইন পেজ',
    mediaWorldCopy: 'বরং ক্রু, অভিনেতা বা সঙ্গীতশিল্পী খুঁজছেন?',
    mediaWorldLink: 'মিডিয়া ওয়ার্ল্ড প্রোফাইল খুলুন',
    backToMediaWorld: '← মিডিয়া ওয়ার্ল্ড',
    memberRentTitle: 'এই অ্যাকাউন্ট আগে থেকেই ফর রেন্ট',
    memberRentCopy: 'এর প্রোভাইডার প্রোফাইল সংরক্ষিত আছে, তাই এখানে নতুন করে নিবন্ধন করার কিছু নেই।',
    memberRentCta: 'ভাড়া ড্যাশবোর্ডে যান',
    memberNoProviderCopy: 'এই অ্যাকাউন্ট ফর রেন্ট হিসেবে নিবন্ধিত, কিন্তু এখনো প্রোভাইডার প্রোফাইল নেই। লিস্টিং প্রকাশের আগে সেটি সংরক্ষণ করুন।',
    memberNoProviderCta: 'প্রোভাইডার সেটআপ খুলুন',
    memberProfileCta: 'আমার মিডিয়া ওয়ার্ল্ড প্রোফাইল',
    memberOtherTitle: 'এই অ্যাকাউন্ট আগে থেকেই নিবন্ধিত',
    memberOtherCopy: 'প্রতিটি অ্যাকাউন্টে মিডিয়া ওয়ার্ল্ডের মাত্র একটি টাইপ থাকে এবং এখান থেকে পরিবর্তন করা যায় না। পরিবর্তনের জন্য সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।',
    memberOtherType: {
      PROFESSIONAL: 'মিডিয়া ওয়ার্ল্ড প্রফেশনাল',
      BUSINESS: 'ব্যবসা / প্রতিষ্ঠান',
      RENTAL: 'ফর রেন্ট প্রোভাইডার',
    } as Record<string, string>,
    memberOtherCta: 'এই অ্যাকাউন্ট সেট করা আছে',
  },
} as const;

function PasswordToggle({
  shown,
  onToggle,
  showLabel,
  hideLabel,
  testId,
}: {
  shown: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
  testId: string;
}) {
  return (
    <button
      type='button'
      className='mw-pw-toggle'
      onClick={onToggle}
      aria-pressed={shown}
      aria-label={shown ? hideLabel : showLabel}
      data-testid={testId}
    >
      {shown ? (
        <svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
          <path d='M3 3l18 18M10.6 10.7a2.9 2.9 0 0 0 4 4' />
          <path d='M6.7 6.9C4.6 8.3 3.2 10.3 2.5 12c1.4 3.6 5 6.4 9.5 6.4 1.6 0 3.1-.3 4.4-.9' />
          <path d='M19.2 15.3c1.4-1.2 2.4-2.6 2.9-3.3-1.4-3.6-5-6.4-9.5-6.4-.8 0-1.6.1-2.3.3' />
        </svg>
      ) : (
        <svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
          <path d='M2.4 12C4.4 8.1 7.9 5.7 12 5.7s7.6 2.4 9.6 6.3c-2 3.9-5.5 6.3-9.6 6.3s-7.6-2.4-9.6-6.3Z' />
          <circle cx='12' cy='12' r='2.9' />
        </svg>
      )}
    </button>
  );
}

function FieldRow({
  fieldKey,
  label,
  error,
  children,
}: {
  fieldKey: string;
  label: string;
  error: string;
  children: React.ReactNode;
}) {
  return (
    <div className='mw-setup-field'>
      <label style={LABEL_STYLE} htmlFor={FIELD_IDS[fieldKey]}>{label}</label>
      {children}
      {error ? <span className='mw-field-error'>{error}</span> : null}
    </div>
  );
}

export default function RentalSignupForm({
  taxonomy,
  title,
  authenticated,
  accountType = null,
  username = null,
  hasProvider = false,
}: {
  taxonomy: TaxonomySnapshot;
  title: { bn: string; en: string };
  authenticated: boolean;
  accountType?: 'PROFESSIONAL' | 'BUSINESS' | 'RENTAL' | null;
  username?: string | null;
  hasProvider?: boolean;
}) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const t = TEXT[language];

  const [personal, setPersonal] = useState<RentalPersonalDraft>(EMPTY_PERSONAL);
  const [service, setService] = useState<RentalServiceDraft>(EMPTY_SERVICE);
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSuggested, setPasswordSuggested] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const districts = districtsForDivision(personal.division);

  const header = (
    <div className='mw-onb-head'>
      <h1>{bn ? title.bn : title.en}</h1>
      <span className='mw-onb-badge'>{accountType === 'RENTAL' ? 'For Rent' : '🚐'}</span>
    </div>
  );

  const backPill = (
    <Link href='/mediaworld' data-testid='for-rent-back-to-mediaworld'>{t.backToMediaWorld}</Link>
  );

  function setPersonalField(key: keyof RentalPersonalDraft, value: string) {
    setPersonal((current) => ({
      ...current,
      [key]: value,
      ...(key === 'division' ? { district: '' } : {}),
    }));
    setErrors((current) => ({ ...current, [key]: '' }));
  }

  function setServiceField(key: keyof RentalServiceDraft, value: string) {
    setService((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  }

  function setPasswordField(key: 'password' | 'confirmPassword', value: string) {
    setPasswords((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  }

  function suggestPassword() {
    const next = generateStrongPassword();
    setPasswords({ password: next, confirmPassword: next });
    setErrors((current) => ({ ...current, password: '', confirmPassword: '' }));
    setShowPasswords(true);
    setPasswordSuggested(true);
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (personal.name.trim().length < 2) next.name = t.nameError;
    if (!EMAIL_RE.test(personal.email.trim())) next.email = t.emailError;
    if (!BD_MOBILE_RE.test(personal.phone.replace(/[\s\-()]/g, ''))) next.phone = t.phoneError;
    if (passwords.password.length < 8
      || !/[a-z]/.test(passwords.password)
      || !/[A-Z]/.test(passwords.password)
      || !/\d/.test(passwords.password)) {
      next.password = t.passwordError;
    }
    if (passwords.password !== passwords.confirmPassword) next.confirmPassword = t.passwordMismatch;
    if (!personal.division) next.division = t.divisionError;
    if (!personal.district) next.district = t.districtError;
    if (personal.presentAddress.trim().length < 5) next.presentAddress = t.addressError;
    if (service.ownerName.trim().length < 2) next.ownerName = t.ownerError;
    if (service.location.trim().length < 2) next.location = t.locationError;
    if (service.description.trim().length < 10) next.description = t.descriptionError;
    return next;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    const localErrors = validate();
    setErrors(localErrors);
    const firstError = Object.keys(localErrors)[0];
    if (firstError) {
      focusField(firstError);
      return;
    }

    setBusy(true);
    const body = new FormData();
    body.set('name', personal.name.trim());
    body.set('email', personal.email.trim());
    body.set('phone', personal.phone.trim());
    body.set('password', passwords.password);
    body.set('confirmPassword', passwords.confirmPassword);
    body.set('division', personal.division);
    body.set('district', personal.district);
    body.set('presentAddress', personal.presentAddress.trim());
    body.set('ownerName', service.ownerName.trim());
    body.set('location', service.location.trim());
    body.set('description', service.description.trim());
    const businessName = service.businessName.trim();
    if (businessName) body.set('businessName', businessName);
    const fullAddress = service.fullAddress.trim();
    if (fullAddress) body.set('fullAddress', fullAddress);
    if (logoFile) body.set('logo', logoFile);

    const { ok, status, json } = await sendForm('/api/mediaworld/rental-signup', 'POST', body);
    setBusy(false);

    if (!ok) {
      const fieldErrors = readFieldErrors(json);
      setErrors(fieldErrors);
      const firstField = Object.keys(fieldErrors)[0];
      if (firstField) focusField(firstField);
      setMessage({
        tone: 'error',
        text: status === 0
          ? (bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en)
          : readError(json, { bn: t.formFallback, en: TEXT.en.formFallback }, bn),
      });
      return;
    }

    setMessage({ tone: 'ok', text: t.success });
    // Full document load: a tab left open across a rebuild navigates on stale
    // client chunks and leaves the new provider inside this form.
    window.location.assign('/for-rent/dashboard');
  }

  if (accountType === 'RENTAL') {
    return (
      <div className='mw-onb-step'>
        {header}
        <h2>{t.memberRentTitle}</h2>
        <p className='mw-onb-lead'>{hasProvider ? t.memberRentCopy : t.memberNoProviderCopy}</p>
        <div className='mw-onb-alt-links'>
          {hasProvider ? (
            <Link href='/for-rent/dashboard' data-testid='mw-rent-signup-listings'>{t.memberRentCta}</Link>
          ) : (
            <Link href='/mediaworld/onboarding' data-testid='mw-rent-signup-setup'>{t.memberNoProviderCta}</Link>
          )}
          {username ? (
            <Link href={`/mediaworld/talent/${encodeURIComponent(username)}`} data-testid='mw-rent-signup-profile'>
              {t.memberProfileCta}
            </Link>
          ) : null}
          {backPill}
        </div>
      </div>
    );
  }

  if (accountType) {
    return (
      <div className='mw-onb-step'>
        {header}
        <h2>{t.memberOtherTitle}</h2>
        <p className='mw-onb-lead'>{t.memberOtherCopy}</p>
        <p className='mw-onb-note'>{`${t.memberOtherCta} ${t.memberOtherType[accountType] ?? accountType}.`}</p>
        <div className='mw-onb-alt-links'>{backPill}</div>
      </div>
    );
  }

  return (
    <div className='mw-onb-step'>
      {header}

      <div className='mw-onb-alt-links' style={{ marginTop: 12 }}>
        {backPill}
      </div>

      <p className='mw-onb-lead'>{authenticated ? t.signedInLead : t.signedOutLead}</p>

      {message ? <FormAlert message={message.text} tone={message.tone} /> : null}

      <form onSubmit={handleSubmit}>
        <h2 style={{ marginTop: 10 }}>{t.personalTitle}</h2>
        <p className='mw-onb-lead'>{t.personalLead}</p>

        <div className='mw-onb-two-col'>
          <FieldRow fieldKey='name' label={t.fullName} error={errorText(errors.name)}>
            <input
              id={FIELD_IDS.name}
              type='text'
              className={INPUT_CLASS}
              value={personal.name}
              autoComplete='name'
              aria-invalid={Boolean(errors.name)}
              onChange={(event) => setPersonalField('name', event.target.value)}
            />
          </FieldRow>

          <FieldRow fieldKey='email' label={t.email} error={errorText(errors.email)}>
            <input
              id={FIELD_IDS.email}
              type='email'
              className={INPUT_CLASS}
              value={personal.email}
              autoComplete='email'
              aria-invalid={Boolean(errors.email)}
              onChange={(event) => setPersonalField('email', event.target.value)}
            />
          </FieldRow>

          <FieldRow fieldKey='phone' label={t.phone} error={errorText(errors.phone)}>
            <input
              id={FIELD_IDS.phone}
              type='tel'
              className={INPUT_CLASS}
              value={personal.phone}
              autoComplete='tel'
              placeholder='01700000000'
              aria-invalid={Boolean(errors.phone)}
              onChange={(event) => setPersonalField('phone', event.target.value)}
            />
          </FieldRow>

          <FieldRow fieldKey='division' label={t.division} error={errorText(errors.division)}>
            <select
              id={FIELD_IDS.division}
              className={INPUT_CLASS}
              value={personal.division}
              aria-invalid={Boolean(errors.division)}
              onChange={(event) => setPersonalField('division', event.target.value)}
            >
              <option value=''>{t.selectDivision}</option>
              {DIVISIONS.map((division) => (
                <option key={division} value={division}>{division}</option>
              ))}
            </select>
          </FieldRow>

          <FieldRow fieldKey='district' label={t.district} error={errorText(errors.district)}>
            <select
              id={FIELD_IDS.district}
              className={INPUT_CLASS}
              value={personal.district}
              disabled={!personal.division}
              aria-invalid={Boolean(errors.district)}
              onChange={(event) => setPersonalField('district', event.target.value)}
            >
              <option value=''>{personal.division ? t.selectDistrict : t.selectDistrictFirst}</option>
              {districts.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </FieldRow>

          <FieldRow fieldKey='password' label={t.password} error={errorText(errors.password)}>
            <div className='mw-pw-wrap'>
              <input
                id={FIELD_IDS.password}
                type={showPasswords ? 'text' : 'password'}
                className={INPUT_CLASS}
                value={passwords.password}
                autoComplete='new-password'
                aria-invalid={Boolean(errors.password)}
                onChange={(event) => setPasswordField('password', event.target.value)}
              />
              <PasswordToggle
                shown={showPasswords}
                onToggle={() => setShowPasswords((current) => !current)}
                showLabel={t.showPassword}
                hideLabel={t.hidePassword}
                testId='mw-rent-password-toggle'
              />
            </div>
          </FieldRow>

          <FieldRow fieldKey='confirmPassword' label={t.confirm} error={errorText(errors.confirmPassword)}>
            <div className='mw-pw-wrap'>
              <input
                id={FIELD_IDS.confirmPassword}
                type={showPasswords ? 'text' : 'password'}
                className={INPUT_CLASS}
                value={passwords.confirmPassword}
                autoComplete='new-password'
                aria-invalid={Boolean(errors.confirmPassword)}
                onChange={(event) => setPasswordField('confirmPassword', event.target.value)}
              />
              <PasswordToggle
                shown={showPasswords}
                onToggle={() => setShowPasswords((current) => !current)}
                showLabel={t.showPassword}
                hideLabel={t.hidePassword}
                testId='mw-rent-confirm-toggle'
              />
            </div>
          </FieldRow>

          <div className='mw-setup-field wide'>
            <div className='mw-pw-tools'>
              <button
                type='button'
                className='mw-setup-skip'
                onClick={suggestPassword}
                disabled={busy}
                data-testid='mw-rent-suggest-password'
              >
                {t.suggestPassword}
              </button>
              {passwordSuggested ? <span className='mw-onb-muted'>{t.suggestedNote}</span> : null}
            </div>
          </div>

          <div className='mw-setup-field wide'>
            <label style={LABEL_STYLE} htmlFor={FIELD_IDS.presentAddress}>{t.presentAddress}</label>
            <textarea
              id={FIELD_IDS.presentAddress}
              rows={2}
              className={INPUT_CLASS}
              value={personal.presentAddress}
              autoComplete='street-address'
              placeholder={t.addressPlaceholder}
              aria-invalid={Boolean(errors.presentAddress)}
              onChange={(event) => setPersonalField('presentAddress', event.target.value)}
            />
            {errorText(errors.presentAddress)
              ? <span className='mw-field-error'>{errorText(errors.presentAddress)}</span>
              : null}
          </div>
        </div>

        <h2 style={{ marginTop: 22 }}>{t.serviceTitle}</h2>
        <p className='mw-onb-lead'>{t.serviceLead}</p>

        <div className='mw-onb-two-col'>
          <FieldRow fieldKey='ownerName' label={t.ownerName} error={errorText(errors.ownerName)}>
            <input
              id={FIELD_IDS.ownerName}
              type='text'
              className={INPUT_CLASS}
              value={service.ownerName}
              autoComplete='name'
              aria-invalid={Boolean(errors.ownerName)}
              onChange={(event) => setServiceField('ownerName', event.target.value)}
            />
          </FieldRow>

          <FieldRow fieldKey='businessName' label={t.businessName} error={errorText(errors.businessName)}>
            <input
              id={FIELD_IDS.businessName}
              type='text'
              className={INPUT_CLASS}
              value={service.businessName}
              onChange={(event) => setServiceField('businessName', event.target.value)}
            />
          </FieldRow>

          <FieldRow fieldKey='location' label={t.location} error={errorText(errors.location)}>
            <input
              id={FIELD_IDS.location}
              type='text'
              className={INPUT_CLASS}
              value={service.location}
              autoComplete='address-level2'
              aria-invalid={Boolean(errors.location)}
              onChange={(event) => setServiceField('location', event.target.value)}
            />
          </FieldRow>

          <FieldRow fieldKey='fullAddress' label={t.fullAddress} error={errorText(errors.fullAddress)}>
            <input
              id={FIELD_IDS.fullAddress}
              type='text'
              className={INPUT_CLASS}
              value={service.fullAddress}
              onChange={(event) => setServiceField('fullAddress', event.target.value)}
            />
          </FieldRow>

          <div className='mw-setup-field wide'>
            <label style={LABEL_STYLE} htmlFor={FIELD_IDS.description}>{t.description}</label>
            <textarea
              id={FIELD_IDS.description}
              rows={4}
              className={INPUT_CLASS}
              value={service.description}
              aria-invalid={Boolean(errors.description)}
              onChange={(event) => setServiceField('description', event.target.value)}
            />
            {errorText(errors.description)
              ? <span className='mw-field-error'>{errorText(errors.description)}</span>
              : <span className='mw-onb-muted'>{t.descriptionHint}</span>}
          </div>
        </div>

        <LogoPicker
          id={FIELD_IDS.logo}
          label={t.logoLabel}
          bn={bn}
          logoUrl={null}
          file={logoFile}
          error={errors.logo}
          onSelect={setLogoFile}
        />

        <button type='submit' className='mediaworld-cta-button' disabled={busy} data-testid='mw-rent-signup-submit'>
          {busy ? t.submitting : t.submit}
        </button>
      </form>

      <div className='mw-onb-categories'>
        <h3>{t.categoriesTitle}</h3>
        <div className='mw-onb-chips'>
          {taxonomy.rentalCategories.map((category) => (
            <span key={category.id} className='mw-onb-chip static'>
              {nodeName(category, bn)}
              <small>{category.subcategories.length}</small>
            </span>
          ))}
        </div>
        <p className='mw-onb-muted'>{t.categoriesNote}</p>
      </div>

      <div className='mw-onb-alt'>
        <p className='mw-onb-alt-title'>{t.loginTitle}</p>
        <p className='mw-onb-alt-note'>{t.loginCopy}</p>
        <div className='mw-onb-alt-links'>
          <button
            type='button'
            onClick={() => setLoginOpen(true)}
            aria-haspopup='dialog'
            data-testid='mw-rent-signup-login'
          >
            {t.loginButton}
          </button>
          <Link href='/login'>{t.fullLoginPage}</Link>
        </div>
        <p className='mw-onb-alt-note'>{t.mediaWorldCopy}</p>
        <div className='mw-onb-alt-links'>
          <Link href='/mediaworld/register' data-testid='mw-rent-signup-media-world'>{t.mediaWorldLink}</Link>
        </div>
      </div>

      <AILoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
