'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { districtsForDivision, DIVISIONS } from '@/lib/constants';
import type { IdentityView } from '@/lib/mediaworld/onboarding';
import type { TaxonomySnapshot } from '@/lib/mediaworld/taxonomy';
import { nodeName } from '@/lib/mediaworld/labels';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { FormAlert } from '@/components/ui/form-field';
import { MAX_PROFILE_MEDIA_BYTES, PROFILE_MEDIA_MIME_TYPES } from '@/lib/profile-media';
import { generateStrongPassword } from '@/lib/client/strong-password';
import {
  ERROR_STYLE,
  INPUT_CLASS,
  LABEL_STYLE,
  NETWORK_ERROR,
  errorText,
  postJson,
  readError,
  readFieldErrors,
  sendJson,
} from '@/lib/client/forms';
import ProfessionalStep from './professional-step';

export type SetupPersonal = {
  name: string;
  email: string;
  phone: string;
  division: string;
  district: string;
  presentAddress: string;
  bio: string;
};

type Step = 1 | 2 | 3 | 4;

const EMPTY_PERSONAL: SetupPersonal = {
  name: '',
  email: '',
  phone: '',
  division: '',
  district: '',
  presentAddress: '',
  bio: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BD_MOBILE_RE = /^(\+?8801[3-9]\d{8}|01[3-9]\d{8})$/;
const CROP_SIZE = 512;
const RESUME_KEY = 'twingface.mediaworld.setup-step';
const PROFILE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

const SIGNUP_ERROR = { bn: 'অ্যাকাউন্ট তৈরি করা যায়নি।', en: 'Unable to create your account.' };
const SAVE_ERROR = { bn: 'তথ্য সংরক্ষণ করা যায়নি।', en: 'Unable to save your details.' };
const FINISH_ERROR = { bn: 'সেটআপ সম্পূর্ণ করা যায়নি।', en: 'Unable to finish setup.' };

const PERSONAL_FIELD_IDS: Record<string, string> = {
  name: 'mw-setup-name',
  email: 'mw-setup-email',
  phone: 'mw-setup-phone',
  password: 'mw-setup-password',
  confirmPassword: 'mw-setup-confirm',
  division: 'mw-setup-division',
  district: 'mw-setup-district',
  presentAddress: 'mw-setup-present',
  bio: 'mw-setup-bio',
};

function focusPersonalField(key: string) {
  const id = PERSONAL_FIELD_IDS[key];
  if (id) document.getElementById(id)?.focus();
}

function clampOffsetFor(image: HTMLImageElement, zoom: number, x: number, y: number) {
  const scale = Math.max(CROP_SIZE / image.width, CROP_SIZE / image.height) * zoom;
  const maxX = Math.max(0, (image.width * scale - CROP_SIZE) / 2);
  const maxY = Math.max(0, (image.height * scale - CROP_SIZE) / 2);
  return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
}

const TEXT = {
  en: {
    title: 'Create your Media World profile',
    leadSignup: 'Four short steps: your details, a profile photo, your professions, then a final review.',
    leadProfile: 'Review your account details, manage your professions and finish setup.',
    steps: ['Account & personal', 'Profile photo', 'Professions', 'Review & save'],
    personalTitle: 'Personal information & credentials',
    personalLead: 'This creates your login. You can sign in later with either your email or mobile number.',
    storedNote: 'These details are stored on your account.',
    fullName: 'Full name',
    phone: 'Phone number',
    email: 'Email address',
    password: 'Password',
    confirm: 'Confirm password',
    presentAddress: 'Present address',
    bio: 'About Me (Bio)',
    bioHint: 'Optional. Tell casting directors about your experience, training, and strengths.',
    bioPlaceholder: 'A short introduction about yourself…',
    bioCount: (count: number) => `${count}/500 characters`,
    bioError: 'Bio must be 500 characters or fewer.',
    division: 'Division',
    district: 'District (Zila)',
    selectDivision: 'Select division',
    selectDistrict: 'Select district',
    selectDistrictFirst: 'Select a division first',
    addressPlaceholder: 'House, road, area, upazila…',
    nameError: 'Enter your full name.',
    phoneError: 'Enter a valid Bangladeshi mobile number.',
    emailError: 'Enter a valid email address.',
    passwordError: 'Use at least 8 characters with upper case, lower case and a number.',
    passwordMismatch: 'Passwords do not match.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    suggestPassword: 'Suggest a strong password',
    suggestedNote: 'A random strong password is filled in and shown below — keep it somewhere safe before you continue.',
    divisionError: 'Select your division.',
    districtError: 'Select your district.',
    addressError: 'Enter an address of at least 5 characters.',
    continue: 'Continue',
    saveContinue: 'Save & continue',
    back: 'Previous',
    saveFinish: 'Save & finish',
    photoTitle: 'Profile photo',
    photoLead: 'Upload a square portrait. Drag the image to reposition it and zoom before saving; it becomes your public profile photo.',
    choosePhoto: 'Choose photo',
    changePhoto: 'Change photo',
    savePhoto: 'Save photo & continue',
    saving: 'Saving…',
    skipPhoto: 'Skip for now',
    cropHint: 'Drag the image to frame your face, then adjust the zoom.',
    cropKeys: 'Keyboard: arrow keys move the photo, + and − zoom.',
    zoom: 'Zoom',
    resetCrop: 'Reset',
    cancelCrop: 'Cancel',
    photoOptional: 'A clear face photo helps people recognise you. You can add it later.',
    photoReady: 'This photo appears on your public profile.',
    photoSaved: 'Profile photo updated.',
    photoAlt: 'Profile photo preview',
    photoTypeError: 'Choose a JPEG, PNG, WebP, or GIF image.',
    photoSizeError: 'Image must be 5 MB or smaller.',
    photoError: 'Unable to save your photo. Please try again.',
    sessionExpired: 'Your session expired. Sign in again to upload a photo.',
    previewTitle: 'Live profile preview',
    previewName: 'Your name',
    previewHandle: 'your-handle',
    previewBadge: 'Media professional',
    previewPlace: 'Division · District',
    previewNoBio: 'Your About Me text will appear here.',
    previewNoProfessions: 'Your designations will appear here.',
    previewAddress: 'Your present address appears here.',
    previewNote: 'Live preview — this card updates as you fill the steps.',
    altTitle: 'Not the right form for you?',
    altRental: 'Renting out gear, a vehicle or a location — For Rent provider setup',
    altRentalVisitor: 'Renting out gear, a vehicle or a location — open a For Rent account in one form',
    altChannelHub: 'Creator channels — open ChannelHub',
    altChannelHubNote: 'ChannelHub is coming soon — it has no separate sign-up yet.',
    reviewTitle: 'Review & save',
    reviewLead: 'Check everything below. Your details, photo and professions are already saved as you go.',
    personalSummary: 'Personal information',
    photoLabel: 'Profile photo',
    publicLink: 'Public profile',
    professionSummary: 'Selected professions',
    noneYet: 'No professions added yet.',
    needProfession: 'Add at least one profession before finishing.',
    addProfession: 'Add a profession',
    savedNote: 'Finishing verifies your profile and opens your public Media World profile.',
    notProvided: 'Not provided',
    restartBack: '← Back',
    restartTitle: 'Are you sure?',
    restartLead: 'Going back returns you to step 1 so you can choose again, and clears what you have typed here. Details already saved to your account stay saved.',
    restartYes: 'Yes, go back',
    restartNo: 'No, keep going',
  },
  bn: {
    title: 'মিডিয়া ওয়ার্ল্ড প্রোফাইল তৈরি করুন',
    leadSignup: 'চারটি ছোট ধাপ: আপনার তথ্য, প্রোফাইল ছবি, আপনার পেশা, তারপর চূড়ান্ত পর্যালোচনা।',
    leadProfile: 'আপনার অ্যাকাউন্টের তথ্য দেখুন, পেশা পরিচালনা করুন এবং সেটআপ শেষ করুন।',
    steps: ['অ্যাকাউন্ট ও ব্যক্তিগত তথ্য', 'প্রোফাইল ছবি', 'পেশা', 'পর্যালোচনা ও সংরক্ষণ'],
    personalTitle: 'ব্যক্তিগত তথ্য ও লগইন',
    personalLead: 'এটি আপনার লগইন তৈরি করবে। পরে ইমেইল বা মোবাইল নম্বর — যেকোনোটি দিয়ে সাইন ইন করতে পারবেন।',
    storedNote: 'এই তথ্য আপনার অ্যাকাউন্টে সংরক্ষিত আছে।',
    fullName: 'পূর্ণ নাম',
    phone: 'মোবাইল নম্বর',
    email: 'ইমেইল ঠিকানা',
    password: 'পাসওয়ার্ড',
    confirm: 'পাসওয়ার্ড নিশ্চিত করুন',
    presentAddress: 'বর্তমান ঠিকানা',
    bio: 'আমার সম্পর্কে (বায়ো)',
    bioHint: 'ঐচ্ছিক। কাস্টিং ডিরেক্টরদের আপনার অভিজ্ঞতা, প্রশিক্ষণ ও দক্ষতার কথা জানান।',
    bioPlaceholder: 'নিজের সম্পর্কে সংক্ষেপে লিখুন…',
    bioCount: (count: number) => `${count}/৫০০ অক্ষর`,
    bioError: 'বায়ো ৫০০ অক্ষরের মধ্যে হতে হবে।',
    division: 'বিভাগ',
    district: 'জেলা',
    selectDivision: 'বিভাগ নির্বাচন করুন',
    selectDistrict: 'জেলা নির্বাচন করুন',
    selectDistrictFirst: 'আগে বিভাগ নির্বাচন করুন',
    addressPlaceholder: 'বাড়ি, রাস্তা, এলাকা, উপজেলা…',
    nameError: 'আপনার পূর্ণ নাম লিখুন।',
    phoneError: 'সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন।',
    emailError: 'সঠিক ইমেইল ঠিকানা লিখুন।',
    passwordError: 'অন্তত ৮ অক্ষর, বড় ও ছোট হাতের অক্ষর এবং একটি সংখ্যা ব্যবহার করুন।',
    passwordMismatch: 'পাসওয়ার্ড মিলছে না।',
    showPassword: 'পাসওয়ার্ড দেখান',
    hidePassword: 'পাসওয়ার্ড লুকান',
    suggestPassword: 'একটি শক্তিশালী পাসওয়ার্ড দিন',
    suggestedNote: 'নিচে এলোমেলো একটি শক্তিশালী পাসওয়ার্ড বসানো ও দেখানো হয়েছে — এগিয়ে যাওয়ার আগে নিরাপদ জায়গায় রাখুন।',
    divisionError: 'আপনার বিভাগ নির্বাচন করুন।',
    districtError: 'আপনার জেলা নির্বাচন করুন।',
    addressError: 'অন্তত ৫ অক্ষরের ঠিকানা লিখুন।',
    continue: 'পরবর্তী',
    saveContinue: 'সংরক্ষণ করে এগিয়ে যান',
    back: 'পূর্ববর্তী',
    saveFinish: 'সংরক্ষণ করে শেষ করুন',
    photoTitle: 'প্রোফাইল ছবি',
    photoLead: 'একটি স্কয়ার পোর্ট্রেট ছবি আপলোড করুন। সংরক্ষণের আগে ছবিটি টেনে জায়গা বদলাতে ও জুম করতে পারবেন; এটিই আপনার পাবলিক প্রোফাইল ছবি হবে।',
    choosePhoto: 'ছবি বেছে নিন',
    changePhoto: 'ছবি বদলান',
    savePhoto: 'ছবি সংরক্ষণ করে এগিয়ে যান',
    saving: 'সংরক্ষণ হচ্ছে…',
    skipPhoto: 'এখনই নয়',
    cropHint: 'ছবিটি টেনে মুখের অংশ ঠিক করুন, তারপর জুম বাড়ান বা কমান।',
    cropKeys: 'কীবোর্ড: তীর চিহ্নে ছবি সরান, + ও − দিয়ে জুম করুন।',
    zoom: 'জুম',
    resetCrop: 'রিসেট',
    cancelCrop: 'বাতিল',
    photoOptional: 'স্পষ্ট মুখের ছবি থাকলে সহজে চেনা যায়। পরে যোগ করলেও চলবে।',
    photoReady: 'এই ছবিটি আপনার পাবলিক প্রোফাইলে দেখা যাবে।',
    photoSaved: 'প্রোফাইল ছবি সংরক্ষিত হয়েছে।',
    photoAlt: 'প্রোফাইল ছবির প্রিভিউ',
    photoTypeError: 'JPEG, PNG, WebP বা GIF ছবি বেছে নিন।',
    photoSizeError: 'ছবির আকার ৫ MB বা কম হতে হবে।',
    photoError: 'ছবি সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
    sessionExpired: 'সেশন শেষ হয়েছে। ছবি আপলোড করতে আবার সাইন ইন করুন।',
    previewTitle: 'লাইভ প্রোফাইল প্রিভিউ',
    previewName: 'আপনার নাম',
    previewHandle: 'your-handle',
    previewBadge: 'মিডিয়া প্রফেশনাল',
    previewPlace: 'বিভাগ · জেলা',
    previewNoBio: 'আপনার “আমার সম্পর্কে” লেখাটি এখানে দেখা যাবে।',
    previewNoProfessions: 'আপনার পদ এখানে দেখা যাবে।',
    previewAddress: 'আপনার বর্তমান ঠিকানা এখানে দেখা যাবে।',
    previewNote: 'লাইভ প্রিভিউ — ধাপগুলো পূরণ করলেই এই কার্ড আপডেট হয়।',
    altTitle: 'আপনার জন্য সঠিক ফর্ম নয়?',
    altRental: 'সরঞ্জাম, গাড়ি বা লোকেশন ভাড়া দেন — ফর রেন্ট প্রোভাইডার সেটআপ',
    altRentalVisitor: 'সরঞ্জাম, গাড়ি বা লোকেশন ভাড়া দেন — এক ফর্মেই ফর রেন্ট অ্যাকাউন্ট খুলুন',
    altChannelHub: 'ক্রিয়েটর চ্যানেল — ChannelHub দেখুন',
    altChannelHubNote: 'ChannelHub শীঘ্রই আসছে — এর আলাদা রেজিস্ট্রেশন এখনও খোলা হয়নি।',
    reviewTitle: 'পর্যালোচনা ও সংরক্ষণ',
    reviewLead: 'নিচের সবকিছু দেখে নিন। তথ্য, ছবি ও পেশা আগেই সংরক্ষিত হয়েছে।',
    personalSummary: 'ব্যক্তিগত তথ্য',
    photoLabel: 'প্রোফাইল ছবি',
    publicLink: 'পাবলিক প্রোফাইল',
    professionSummary: 'নির্বাচিত পেশা',
    noneYet: 'এখনো কোনো পেশা যোগ করা হয়নি।',
    needProfession: 'শেষ করার আগে অন্তত একটি পেশা যোগ করুন।',
    addProfession: 'পেশা যোগ করুন',
    savedNote: 'শেষ করলে প্রোফাইল যাচাই হয়ে আপনার পাবলিক মিডিয়া ওয়ার্ল্ড প্রোফাইল খুলবে।',
    notProvided: 'দেওয়া হয়নি',
    restartBack: '← পেছনে যান',
    restartTitle: 'আপনি কি নিশ্চিত?',
    restartLead: 'পেছনে ফিরলে ধাপ ১ থেকে আবার শুরু করতে পারবেন এবং এই পেজে লেখা তথ্য মুছে যাবে। অ্যাকাউন্টে আগেই সংরক্ষিত তথ্য অটুট থাকবে।',
    restartYes: 'হ্যাঁ, পেছনে যান',
    restartNo: 'না, এগিয়ে যান',
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

export default function SetupWizard({
  taxonomy,
  authenticated,
  initialPersonal,
  initialIdentities,
  initialUsername = null,
  initialPhoto = null,
}: {
  taxonomy: TaxonomySnapshot;
  authenticated: boolean;
  initialPersonal: SetupPersonal | null;
  initialIdentities: IdentityView[];
  initialUsername?: string | null;
  initialPhoto?: string | null;
}) {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';
  const t = TEXT[language];

  const [step, setStep] = useState<Step>(authenticated ? 3 : 1);
  const [personal, setPersonal] = useState<SetupPersonal>(initialPersonal ?? EMPTY_PERSONAL);
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' });
  const [identities, setIdentities] = useState<IdentityView[]>(initialIdentities);
  const [username, setUsername] = useState(initialUsername ?? '');
  const [photoUrl, setPhotoUrl] = useState(initialPhoto ?? '');
  const [photoPreview, setPhotoPreview] = useState(initialPhoto ?? '');
  const [photoSource, setPhotoSource] = useState<{ image: HTMLImageElement; objectUrl: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [restartAsked, setRestartAsked] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSuggested, setPasswordSuggested] = useState(false);

  // A successful signup in this browser already set the session cookie, so the
  // rest of the flow edits the account instead of trying to sign up again.
  const signedIn = authenticated || accountCreated;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewTimer = useRef<number | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const districts = useMemo(() => districtsForDivision(personal.division), [personal.division]);

  const grouped = useMemo(() => {
    const byIndustry = new Map<string, { label: string; categories: Map<string, { label: string; items: IdentityView[] }> }>();
    for (const identity of identities) {
      const industryGroup = byIndustry.get(identity.industry.id)
        ?? { label: nodeName(identity.industry, bn), categories: new Map() };
      const categoryGroup = industryGroup.categories.get(identity.mainCategory.id)
        ?? { label: nodeName(identity.mainCategory, bn), items: [] as IdentityView[] };
      categoryGroup.items.push(identity);
      industryGroup.categories.set(identity.mainCategory.id, categoryGroup);
      byIndustry.set(identity.industry.id, industryGroup);
    }
    return [...byIndustry.values()];
  }, [identities, bn]);

  const schedulePreview = useCallback(() => {
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) setPhotoPreview(canvas.toDataURL('image/jpeg', 0.82));
    }, 140);
  }, []);

  const drawCrop = useCallback(() => {
    const canvas = canvasRef.current;
    const image = photoSource?.image;
    if (!canvas || !image) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const clamped = clampOffsetFor(image, zoom, offset.x, offset.y);
    const scale = Math.max(CROP_SIZE / image.width, CROP_SIZE / image.height) * zoom;
    const width = image.width * scale;
    const height = image.height * scale;
    context.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    context.drawImage(
      image,
      (CROP_SIZE - width) / 2 + clamped.x,
      (CROP_SIZE - height) / 2 + clamped.y,
      width,
      height,
    );
    schedulePreview();
  }, [photoSource, zoom, offset, schedulePreview]);

  useEffect(() => { drawCrop(); }, [drawCrop]);

  // A session cookie appearing mid-flow can re-render this page; restore the
  // step the user was on so the photo step is not skipped.
  useEffect(() => {
    try {
      const saved = Number(window.sessionStorage.getItem(RESUME_KEY));
      if (Number.isInteger(saved) && saved >= 1 && saved <= 4) setStep(saved as Step);
    } catch { /* storage can be blocked */ }
  }, []);

  useEffect(() => {
    try { window.sessionStorage.setItem(RESUME_KEY, String(step)); } catch { /* storage can be blocked */ }
  }, [step]);

  useEffect(() => {
    if (!photoSource) return;
    return () => URL.revokeObjectURL(photoSource.objectUrl);
  }, [photoSource]);

  useEffect(() => () => {
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
  }, []);

  function setField(key: keyof SetupPersonal, value: string) {
    setPersonal((current) => ({
      ...current,
      [key]: value,
      ...(key === 'division' ? { district: '' } : {}),
    }));
    setErrors((current) => ({ ...current, [key]: '' }));
  }

  function suggestPassword() {
    const next = generateStrongPassword();
    setPasswords({ password: next, confirmPassword: next });
    setErrors((current) => ({ ...current, password: '', confirmPassword: '' }));
    setShowPasswords(true);
    setPasswordSuggested(true);
  }

  function moveTo(target: Step) {
    setMessage(null);
    setRestartAsked(false);
    setStep(target);
  }

  function goTo(target: Step) {
    if (busy || photoBusy || target > step) return;
    moveTo(target);
  }

  function askRestart() {
    if (busy || photoBusy) return;
    setMessage(null);
    setRestartAsked(true);
  }

  function restartFromFirstStep() {
    setPhotoSource(null);
    setPhotoPreview(photoUrl);
    setPhotoError('');
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setPasswords({ password: '', confirmPassword: '' });
    setShowPasswords(false);
    setPasswordSuggested(false);
    // Names, professions and the photo already reached the account, so they stay;
    // only this page's typed draft is cleared.
    setPersonal(initialPersonal ?? EMPTY_PERSONAL);
    setErrors({});
    moveTo(1);
  }

  function validatePersonal(): boolean {
    const next: Record<string, string> = {};
    if (personal.name.trim().length < 2) next.name = t.nameError;
    if (!BD_MOBILE_RE.test(personal.phone.replace(/[\s\-()]/g, ''))) next.phone = t.phoneError;
    if (!EMAIL_RE.test(personal.email.trim())) next.email = t.emailError;
    if (!signedIn) {
      if (passwords.password.length < 8) next.password = t.passwordError;
      else if (passwords.password !== passwords.confirmPassword) next.confirmPassword = t.passwordMismatch;
    }
    if (!personal.division) next.division = t.divisionError;
    if (!personal.district) next.district = t.districtError;
    if (personal.presentAddress.trim().length < 5) next.presentAddress = t.addressError;
    setErrors(next);
    const firstError = Object.keys(next)[0];
    if (firstError) focusPersonalField(firstError);
    return Object.keys(next).length === 0;
  }

  async function submitPersonal() {
    if (!validatePersonal()) return;

    setBusy(true);
    setMessage(null);
    const { ok, status, json } = signedIn
      ? await sendJson('/api/mediaworld/profile/personal', 'PATCH', personal)
      : await postJson('/api/mediaworld/signup', { ...personal, ...passwords });
    setBusy(false);

    if (!ok) {
      const mapped: Record<string, string> = {};
      for (const [field, value] of Object.entries(readFieldErrors(json))) mapped[field] = errorText(value);
      setErrors(mapped);
      const firstField = Object.keys(mapped)[0];
      if (firstField) focusPersonalField(firstField);
      setMessage({
        tone: 'error',
        text: status === 0
          ? (bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en)
          : readError(json, signedIn ? SAVE_ERROR : SIGNUP_ERROR, bn),
      });
      return;
    }

    const saved = (json as {
      user?: Partial<SetupPersonal> & { username?: string };
    } | null)?.user;
    setPersonal((current) => ({
      ...current,
      email: saved?.email ?? current.email,
      phone: saved?.phone ?? current.phone,
      bio: saved ? (saved.bio ?? '') : current.bio,
    }));
    if (saved?.username) setUsername(saved.username);
    if (!authenticated) setAccountCreated(true);
    setPasswords({ password: '', confirmPassword: '' });
    moveTo(2);
  }

  function selectPhoto(file: File | null) {
    if (!file) return;
    setPhotoError('');
    if (!PROFILE_MEDIA_MIME_TYPES.includes(file.type as (typeof PROFILE_MEDIA_MIME_TYPES)[number])) {
      setPhotoError(t.photoTypeError);
      return;
    }
    if (file.size > MAX_PROFILE_MEDIA_BYTES) {
      setPhotoError(t.photoSizeError);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    setPhotoBusy(true);
    image.onload = () => {
      setPhotoSource({ image, objectUrl });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setPhotoBusy(false);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setPhotoBusy(false);
      setPhotoError(t.photoTypeError);
    };
    image.src = objectUrl;
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function cancelCrop() {
    setPhotoSource(null);
    setPhotoPreview(photoUrl);
    setPhotoError('');
  }

  function resetCrop() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!photoSource) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const current = drag.current;
    if (!current || !photoSource) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = CROP_SIZE / (rect.width || CROP_SIZE);
    setOffset(clampOffsetFor(
      photoSource.image,
      zoom,
      current.ox + (event.clientX - current.x) * ratio,
      current.oy + (event.clientY - current.y) * ratio,
    ));
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    drag.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }
  }

  function canvasKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
    if (!photoSource) return;
    if (event.key === '+' || event.key === '=' || event.key === '-') {
      event.preventDefault();
      const direction = event.key === '-' ? -1 : 1;
      setZoom((current) => Math.min(3, Math.max(1, current + direction * 0.1)));
      return;
    }
    const step = event.shiftKey ? 24 : 8;
    const moves: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setOffset((current) => clampOffsetFor(photoSource.image, zoom, current.x + move.x, current.y + move.y));
  }

  async function savePhotoAndContinue() {
    if (photoBusy) return;
    if (!photoSource) {
      moveTo(3);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setPhotoError(t.photoError);
      return;
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) {
      setPhotoError(t.photoError);
      return;
    }

    setPhotoBusy(true);
    setPhotoError('');
    setMessage(null);
    try {
      const form = new FormData();
      form.set('kind', 'profile');
      form.set('image', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      const response = await fetch('/api/profile/media', { method: 'POST', body: form }).catch(() => null);
      const data = response
        ? await response.json().catch(() => null) as { profile?: { profileImage?: string | null }; error?: string } | null
        : null;

      if (!response || !response.ok || !data?.profile) {
        setPhotoError(response?.status === 401
          ? t.sessionExpired
          : (data?.error || t.photoError));
        return;
      }

      const savedUrl = data.profile.profileImage ?? '';
      setPhotoUrl(savedUrl);
      setPhotoPreview(savedUrl);
      setPhotoSource(null);
      moveTo(3);
      setMessage({ tone: 'ok', text: t.photoSaved });
    } catch {
      setPhotoError(t.photoError);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function finish() {
    if (!identities.length) return;
    setBusy(true);
    setMessage(null);
    const { ok, status, json } = await postJson('/api/mediaworld/setup/complete', {});
    setBusy(false);

    if (!ok) {
      setMessage({
        tone: 'error',
        text: status === 0 ? (bn ? NETWORK_ERROR.bn : NETWORK_ERROR.en) : readError(json, FINISH_ERROR, bn),
      });
      return;
    }

    const handle = (json as { username?: string } | null)?.username || username;
    try { window.sessionStorage.removeItem(RESUME_KEY); } catch { /* storage can be blocked */ }
    window.location.assign(handle ? `/mediaworld/talent/${encodeURIComponent(handle)}` : '/mediaworld');
  }

  const fieldError = (key: string) => (errors[key] ? <span id={`mw-setup-error-${key}`} style={ERROR_STYLE}>{errors[key]}</span> : null);
  const previewPhoto = photoPreview || photoUrl;
  const initial = personal.name.trim().charAt(0).toUpperCase() || '?';
  const handle = username || t.previewHandle;
  const place = [personal.district, personal.division].filter(Boolean).join(' · ');

  return (
    <div className='mw-onb'>
      <header className='mw-onb-head'>
        <div>
          <h1>{t.title}</h1>
          <p className='mw-onb-lead'>{signedIn ? t.leadProfile : t.leadSignup}</p>
        </div>
        <div className='mw-onb-head-actions'>
          {signedIn && personal.name ? <span className='mw-onb-badge'>{personal.name}</span> : null}
          {step > 1 ? (
            <button
              type='button'
              className='mw-setup-back'
              onClick={askRestart}
              disabled={busy || photoBusy}
              aria-expanded={restartAsked}
              aria-controls='mw-restart-confirm'
              data-testid='mw-setup-restart'
            >
              {t.restartBack}
            </button>
          ) : null}
        </div>
      </header>

      {restartAsked ? (
        <div className='mw-restart-confirm' id='mw-restart-confirm' role='alertdialog' aria-labelledby='mw-restart-title'>
          <strong id='mw-restart-title'>{t.restartTitle}</strong>
          <p>{t.restartLead}</p>
          <div className='mw-restart-actions'>
            <button type='button' className='mw-setup-skip' onClick={() => setRestartAsked(false)}>
              {t.restartNo}
            </button>
            <button type='button' className='mw-restart-yes' onClick={restartFromFirstStep} data-testid='mw-setup-restart-yes'>
              {t.restartYes}
            </button>
          </div>
        </div>
      ) : null}

      <ol className='mw-setup-progress'>
        {t.steps.map((label, index) => {
          const id = (index + 1) as Step;
          const state = step === id ? 'active' : step > id ? 'done' : '';
          return (
            <li key={label} className={state}>
              <button
                type='button'
                onClick={() => goTo(id)}
                disabled={busy || photoBusy || id > step}
                aria-current={step === id ? 'step' : undefined}
              >
                <span className='mw-setup-dot'>{step > id ? '✓' : id}</span>
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className='mw-setup-bar' role='progressbar' aria-valuemin={1} aria-valuemax={4} aria-valuenow={step}>
        <i style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      {message ? <FormAlert message={message.text} tone={message.tone} /> : null}

      <div className={step === 4 ? 'mw-setup-layout review' : 'mw-setup-layout'}>
        <div className='mw-setup-main'>
          {step === 1 ? (
            <section className='mw-onb-step'>
              <h2>{t.personalTitle}</h2>
              <p className='mw-onb-lead'>{signedIn ? t.storedNote : t.personalLead}</p>

              <div className='mw-setup-grid' style={{ marginTop: 16 }}>
                <div className='mw-setup-field wide'>
                  <label style={LABEL_STYLE} htmlFor='mw-setup-name'>{t.fullName}</label>
                  <input
                    id='mw-setup-name'
                    name='name'
                    className={INPUT_CLASS}
                    value={personal.name}
                    autoComplete='name'
                    onChange={(event) => setField('name', event.target.value)}
                  />
                  {fieldError('name')}
                </div>

                <div className='mw-setup-field'>
                  <label style={LABEL_STYLE} htmlFor='mw-setup-phone'>{t.phone}</label>
                  <input
                    id='mw-setup-phone'
                    name='phone'
                    className={INPUT_CLASS}
                    value={personal.phone}
                    inputMode='tel'
                    autoComplete='tel'
                    placeholder='01XXXXXXXXX'
                    onChange={(event) => setField('phone', event.target.value)}
                  />
                  {fieldError('phone')}
                </div>

                <div className='mw-setup-field'>
                  <label style={LABEL_STYLE} htmlFor='mw-setup-email'>{t.email}</label>
                  <input
                    id='mw-setup-email'
                    name='email'
                    className={INPUT_CLASS}
                    value={personal.email}
                    type='email'
                    autoComplete='email'
                    placeholder='you@example.com'
                    onChange={(event) => setField('email', event.target.value)}
                  />
                  {fieldError('email')}
                </div>

                {signedIn ? null : (
                  <>
                    <div className='mw-setup-field'>
                      <label style={LABEL_STYLE} htmlFor='mw-setup-password'>{t.password}</label>
                      <div className='mw-pw-wrap'>
                        <input
                          id='mw-setup-password'
                          name='password'
                          className={INPUT_CLASS}
                          type={showPasswords ? 'text' : 'password'}
                          value={passwords.password}
                          autoComplete='new-password'
                          onChange={(event) => setPasswords((current) => ({ ...current, password: event.target.value }))}
                        />
                        <PasswordToggle
                          shown={showPasswords}
                          onToggle={() => setShowPasswords((current) => !current)}
                          showLabel={t.showPassword}
                          hideLabel={t.hidePassword}
                          testId='mw-setup-password-toggle'
                        />
                      </div>
                      {fieldError('password')}
                    </div>

                    <div className='mw-setup-field'>
                      <label style={LABEL_STYLE} htmlFor='mw-setup-confirm'>{t.confirm}</label>
                      <div className='mw-pw-wrap'>
                        <input
                          id='mw-setup-confirm'
                          name='confirmPassword'
                          className={INPUT_CLASS}
                          type={showPasswords ? 'text' : 'password'}
                          value={passwords.confirmPassword}
                          autoComplete='new-password'
                          onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))}
                        />
                        <PasswordToggle
                          shown={showPasswords}
                          onToggle={() => setShowPasswords((current) => !current)}
                          showLabel={t.showPassword}
                          hideLabel={t.hidePassword}
                          testId='mw-setup-confirm-toggle'
                        />
                      </div>
                      {fieldError('confirmPassword')}
                    </div>

                    <div className='mw-setup-field wide'>
                      <div className='mw-pw-tools'>
                        <button
                          type='button'
                          className='mw-setup-skip'
                          onClick={suggestPassword}
                          data-testid='mw-setup-suggest-password'
                        >
                          {t.suggestPassword}
                        </button>
                        {passwordSuggested ? <span className='mw-onb-muted'>{t.suggestedNote}</span> : null}
                      </div>
                    </div>
                  </>
                )}

                <div className='mw-setup-field'>
                  <label style={LABEL_STYLE} htmlFor='mw-setup-division'>{t.division}</label>
                  <select
                    id='mw-setup-division'
                    name='division'
                    className={INPUT_CLASS}
                    value={personal.division}
                    onChange={(event) => setField('division', event.target.value)}
                  >
                    <option value=''>{t.selectDivision}</option>
                    {DIVISIONS.map((division) => (
                      <option key={division} value={division}>{division}</option>
                    ))}
                  </select>
                  {fieldError('division')}
                </div>

                <div className='mw-setup-field'>
                  <label style={LABEL_STYLE} htmlFor='mw-setup-district'>{t.district}</label>
                  <select
                    id='mw-setup-district'
                    name='district'
                    className={INPUT_CLASS}
                    value={personal.district}
                    disabled={!personal.division}
                    onChange={(event) => setField('district', event.target.value)}
                  >
                    <option value=''>{personal.division ? t.selectDistrict : t.selectDistrictFirst}</option>
                    {districts.map((district) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                  {fieldError('district')}
                </div>

                <div className='mw-setup-field wide'>
                  <label style={LABEL_STYLE} htmlFor='mw-setup-present'>{t.presentAddress}</label>
                  <textarea
                    id='mw-setup-present'
                    name='presentAddress'
                    className={INPUT_CLASS}
                    rows={2}
                    value={personal.presentAddress}
                    autoComplete='street-address'
                    placeholder={t.addressPlaceholder}
                    style={{ resize: 'vertical' }}
                    onChange={(event) => setField('presentAddress', event.target.value)}
                  />
                  {fieldError('presentAddress')}
                </div>

                <div className='mw-setup-field wide'>
                  <label style={LABEL_STYLE} htmlFor='mw-setup-bio'>{t.bio}</label>
                  <textarea
                    id='mw-setup-bio'
                    name='bio'
                    className={INPUT_CLASS}
                    rows={3}
                    maxLength={500}
                    value={personal.bio}
                    autoComplete='off'
                    placeholder={t.bioPlaceholder}
                    aria-invalid={Boolean(errors.bio)}
                    aria-describedby='mw-setup-bio-hint mw-setup-bio-count mw-setup-error-bio'
                    style={{ resize: 'vertical' }}
                    onChange={(event) => setField('bio', event.target.value)}
                  />
                  <div className='mw-bio-meta'>
                    <span id='mw-setup-bio-hint' className='mw-onb-muted'>{t.bioHint}</span>
                    <span id='mw-setup-bio-count' className='mw-onb-muted mw-bio-count'>{t.bioCount(personal.bio.length)}</span>
                  </div>
                  {fieldError('bio')}
                </div>
              </div>

              <div className='mw-setup-actions'>
                <span className='mw-onb-muted' />
                <button
                  type='button'
                  className='mediaworld-cta-button'
                  onClick={submitPersonal}
                  disabled={busy}
                  aria-busy={busy}
                >
                  {busy ? t.saving : signedIn ? t.saveContinue : t.continue}
                </button>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className='mw-onb-step'>
              <h2>{t.photoTitle}</h2>
              <p className='mw-onb-lead'>{t.photoLead}</p>

              <div className='mw-photo'>
                {photoSource ? (
                  <div className='mw-photo-crop'>
                    <canvas
                      ref={canvasRef}
                      width={CROP_SIZE}
                      height={CROP_SIZE}
                      className='mw-photo-canvas'
                      role='img'
                      tabIndex={0}
                      aria-label={t.photoAlt}
                      aria-describedby='mw-photo-crop-hint'
                      onPointerDown={pointerDown}
                      onPointerMove={pointerMove}
                      onPointerUp={pointerUp}
                      onPointerCancel={pointerUp}
                      onKeyDown={canvasKeyDown}
                    />
                    <div className='mw-photo-controls'>
                      <label htmlFor='mw-photo-zoom'>{t.zoom}</label>
                      <input
                        id='mw-photo-zoom'
                        type='range'
                        min={1}
                        max={3}
                        step={0.01}
                        value={zoom}
                        onChange={(event) => setZoom(Number(event.target.value))}
                      />
                      <button type='button' className='mw-setup-back' onClick={resetCrop}>{t.resetCrop}</button>
                    </div>
                    <p className='mw-onb-muted' id='mw-photo-crop-hint'>{t.cropHint} {t.cropKeys}</p>
                  </div>
                ) : (
                  <div className='mw-photo-empty'>
                    {photoUrl
                      ? <img className='mw-photo-saved' src={photoUrl} alt={t.photoAlt} width={112} height={112} />
                      : <span className='mw-photo-initial' aria-hidden='true'>{initial}</span>}
                    <div className='mw-photo-empty-copy'>
                      <p className='mw-photo-note'>{photoUrl ? t.photoReady : t.photoOptional}</p>
                      <button
                        type='button'
                        className='mediaworld-cta-button'
                        onClick={() => fileInputRef.current?.click()}
                        disabled={photoBusy}
                      >
                        {photoUrl ? t.changePhoto : t.choosePhoto}
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  className='file-input-visually-hidden'
                  type='file'
                  accept={PROFILE_ACCEPT}
                  aria-label={t.choosePhoto}
                  onChange={(event) => selectPhoto(event.target.files?.[0] ?? null)}
                />
                {photoError ? <p style={ERROR_STYLE} role='alert'>{photoError}</p> : null}
              </div>

              <div className='mw-setup-actions'>
                <button type='button' className='mw-setup-back' onClick={() => goTo(1)} disabled={busy || photoBusy}>
                  {t.back}
                </button>
                <div className='mw-setup-actions-end'>
                  {photoSource ? (
                    <button type='button' className='mw-setup-skip' onClick={cancelCrop} disabled={photoBusy}>
                      {t.cancelCrop}
                    </button>
                  ) : photoUrl ? null : (
                    <button type='button' className='mw-setup-skip' onClick={() => moveTo(3)} disabled={busy || photoBusy}>
                      {t.skipPhoto}
                    </button>
                  )}
                  <button
                    type='button'
                    className='mediaworld-cta-button'
                    onClick={savePhotoAndContinue}
                    disabled={busy || photoBusy}
                  >
                    {photoBusy ? t.saving : photoSource ? t.savePhoto : t.continue}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section>
              <ProfessionalStep taxonomy={taxonomy} identities={identities} onChange={setIdentities} />
              <div className='mw-setup-actions'>
                <button type='button' className='mw-setup-back' onClick={() => goTo(2)} disabled={busy}>
                  {t.back}
                </button>
                <button type='button' className='mediaworld-cta-button' onClick={() => moveTo(4)} disabled={busy}>
                  {t.continue}
                </button>
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className='mw-onb-step'>
              <h2>{t.reviewTitle}</h2>
              <p className='mw-onb-lead'>{t.reviewLead}</p>

              <div className='mw-setup-review' style={{ marginTop: 16 }}>
                <div>
                  <h3>{t.personalSummary}</h3>
                  <dl>
                    <div>
                      <dt>{t.photoLabel}</dt>
                      <dd>
                        {photoUrl
                          ? <img className='mw-setup-review-photo' src={photoUrl} alt={t.photoAlt} width={68} height={68} />
                          : t.notProvided}
                      </dd>
                    </div>
                    <div>
                      <dt>{t.fullName}</dt>
                      <dd>{personal.name || t.notProvided}</dd>
                    </div>
                    <div>
                      <dt>{t.phone}</dt>
                      <dd>{personal.phone || t.notProvided}</dd>
                    </div>
                    <div>
                      <dt>{t.email}</dt>
                      <dd>{personal.email || t.notProvided}</dd>
                    </div>
                    <div>
                      <dt>{t.division} / {t.district}</dt>
                      <dd>{[personal.division, personal.district].filter(Boolean).join(' / ') || t.notProvided}</dd>
                    </div>
                    <div>
                      <dt>{t.presentAddress}</dt>
                      <dd>{personal.presentAddress || t.notProvided}</dd>
                    </div>
                    <div>
                      <dt>{t.publicLink}</dt>
                      <dd>{username ? `/mediaworld/talent/${username}` : t.notProvided}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3>{`${t.professionSummary} (${identities.length})`}</h3>
                  {identities.length ? (
                    <div className='mw-onb-groups'>
                      {grouped.map((group) => (
                        <section key={group.label} className='mw-onb-group'>
                          <h4>{group.label}</h4>
                          {[...group.categories.values()].map((categoryGroup) => (
                            <div key={categoryGroup.label} className='mw-onb-identity-row'>
                              <span className='mw-onb-identity-category'>{categoryGroup.label}</span>
                              {categoryGroup.items.map((identity) => (
                                <span key={identity.id} className='mw-onb-identity'>
                                  <bdi>{nodeName(identity.designation, bn)}</bdi>
                                </span>
                              ))}
                            </div>
                          ))}
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className='mw-setup-warning'>{t.needProfession}</div>
                  )}
                </div>
              </div>

              <p className='mw-onb-note'>{t.savedNote}</p>

              <div className='mw-setup-actions'>
                <button type='button' className='mw-setup-back' onClick={() => goTo(3)} disabled={busy}>
                  {identities.length ? t.back : t.addProfession}
                </button>
                <button
                  type='button'
                  className='mediaworld-cta-button'
                  onClick={finish}
                  disabled={busy || identities.length === 0}
                >
                  {t.saveFinish}
                </button>
              </div>
            </section>
          ) : null}
        </div>

        {step === 4 ? null : (
          <aside className='mw-setup-preview' aria-label={t.previewTitle}>
            <div className='mw-preview-card'>
              <div className='mw-preview-cover' aria-hidden='true' />
              <div className='mw-preview-body'>
                {previewPhoto ? (
                  <img className='mw-preview-avatar' src={previewPhoto} alt={t.photoAlt} width={80} height={80} fetchPriority='high' />
                ) : (
                  <span className='mw-preview-avatar mw-preview-avatar-fallback' aria-hidden='true'>{initial}</span>
                )}
                <strong className='mw-preview-name'>{personal.name.trim() || t.previewName}</strong>
                <span className='mw-preview-handle'>@{handle}</span>
                <span className='mw-preview-badge'>{t.previewBadge}</span>
                <p className='mw-preview-place'>📍 {place || t.previewPlace}</p>
                <p className={`mw-preview-bio${personal.bio.trim() ? '' : ' is-empty'}`}>
                  {personal.bio.trim() || t.previewNoBio}
                </p>

                {identities.length ? (
                  <div className='mw-preview-chips'>
                    {identities.slice(0, 6).map((identity) => (
                      <span key={identity.id}>{nodeName(identity.designation, bn)}</span>
                    ))}
                    {identities.length > 6 ? <span>+{identities.length - 6}</span> : null}
                  </div>
                ) : (
                  <p className='mw-preview-muted'>{t.previewNoProfessions}</p>
                )}

                <p className='mw-preview-address'>{personal.presentAddress.trim() || t.previewAddress}</p>
                <div className='mw-preview-contact'>
                  {personal.phone.trim() ? <span>{personal.phone}</span> : null}
                  {personal.email.trim() ? <span>{personal.email}</span> : null}
                </div>
              </div>
            </div>
            <p className='mw-preview-note'>{t.previewNote}</p>
          </aside>
        )}
      </div>

      <div className='mw-onb-alt'>
        <p className='mw-onb-alt-title'>{t.altTitle}</p>
        <div className='mw-onb-alt-links'>
          <Link href={authenticated ? '/mediaworld/onboarding' : '/for-rent/register'} data-testid='mw-setup-alt-rental'>
            {authenticated ? t.altRental : t.altRentalVisitor}
          </Link>
          {authenticated ? (
            <Link href='/channelhub' data-testid='mw-setup-alt-channelhub'>
              {t.altChannelHub}
            </Link>
          ) : (
            <span className='mw-onb-alt-note'>{t.altChannelHubNote}</span>
          )}
        </div>
      </div>
    </div>
  );
}
