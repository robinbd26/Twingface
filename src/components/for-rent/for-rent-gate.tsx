'use client';

import Link from 'next/link';
import { MediaWorldLanguageToggle, useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';

export default function ForRentGate() {
  const { language } = useMediaWorldLanguage();
  const bn = language === 'bn';

  return (
    <div className='mw-rent-gate'>
      <MediaWorldLanguageToggle />
      <span>🚐</span>
      <strong>{bn ? 'আগে রেন্টাল প্রোভাইডার প্রোফাইল সম্পূর্ণ করুন' : 'Complete your rental provider profile first'}</strong>
      <p>
        {bn
          ? 'তালিকা প্রকাশ, সম্পাদনা ও জিজ্ঞাসা ব্যবস্থাপনা শুধু নিবন্ধিত প্রোভাইডারের জন্য।'
          : 'Publishing, editing and managing inquiries is available to registered rental providers only.'}
      </p>
      <Link href='/mediaworld/onboarding'>{bn ? 'প্রোফাইল সেটআপ করুন' : 'Set up my profile'}</Link>
      <Link className='mw-rent-gate-ghost' href='/mediaworld' data-testid='for-rent-back-to-mediaworld'>
        {bn ? '← মিডিয়া ওয়ার্ল্ডে ফিরুন' : '← Back to Media World'}
      </Link>
    </div>
  );
}
