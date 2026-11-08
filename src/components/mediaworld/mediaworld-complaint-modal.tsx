'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import ComplaintForm from '@/app/(main)/mediaworld/complaint/complaint-form';
import { MediaWorldLanguageToggle, useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';

type MediaWorldComplaintModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function MediaWorldComplaintModal({ open, onClose }: MediaWorldComplaintModalProps) {
  const { language } = useMediaWorldLanguage();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const bn = language === 'bn';

  return (
    <div
      className='mediaworld-complaint-modal-backdrop'
      role='presentation'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className='mediaworld-complaint-modal'
        role='dialog'
        aria-modal='true'
        aria-labelledby='mediaworld-complaint-modal-title'
      >
        <header className='mediaworld-complaint-modal-head'>
          <div>
            <h2 id='mediaworld-complaint-modal-title'>
              {bn ? 'সমস্যা জানান' : 'Submit a complaint'}
            </h2>
            <p>
              {bn
                ? 'ছবি বা ভিডিওসহ প্রমাণ জুড়ে দিন, আমরা দ্রুত ব্যবস্থা নেব।'
                : 'Attach image or video evidence so we can act quickly.'}
            </p>
          </div>
          <div className='mediaworld-complaint-modal-head-actions'>
            <MediaWorldLanguageToggle />
            <button
              type='button'
              className='mediaworld-complaint-modal-close'
              onClick={onClose}
              aria-label={bn ? 'বন্ধ করুন' : 'Close'}
              data-testid='mediaworld-complaint-modal-close'
            >
              ✕
            </button>
          </div>
        </header>

        <div className='mediaworld-complaint-modal-body'>
          <ComplaintForm />
        </div>

        <footer className='mediaworld-complaint-modal-foot'>
          <Link href='/mediaworld/complaint' className='mediaworld-complaint-modal-link'>
            {bn ? 'পূর্ণ পাতায় অভিযোগ করুন' : 'Open the full complaint page'}
          </Link>
        </footer>
      </div>
    </div>
  );
}
