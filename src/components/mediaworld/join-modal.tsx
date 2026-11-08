'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';

type JoinModalProps = {
  open: boolean;
  onClose: () => void;
  authenticated: boolean;
};

type JoinOption = {
  key: string;
  /** Where a signed-in member goes. */
  href: string;
  title: string;
  copy: string;
  /** Where a visitor goes when the member route sits behind sign-in. */
  visitorHref?: string;
  visitorCopy?: string;
  /** No reachable destination exists for a visitor, so the card is not a link. */
  visitorUnavailable?: boolean;
  tone: 'blue' | 'amber' | 'violet';
  icon: ReactNode;
};

const OPTIONS: readonly JoinOption[] = [
  {
    key: 'media-world',
    href: '/mediaworld/register',
    title: 'Media World',
    copy: 'Create your professional profile and get discovered by producers.',
    tone: 'blue',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
        <rect x='3' y='4' width='18' height='16' rx='2.5' />
        <path d='M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4' />
      </svg>
    ),
  },
  {
    key: 'for-rent',
    href: '/for-rent',
    visitorHref: '/for-rent/register',
    title: 'For Rent',
    copy: 'Book cameras, studios, light setups and crew for your shoot.',
    visitorCopy: 'Open a For Rent account with your details and rental service in one form, then list gear, a vehicle or a location.',
    tone: 'amber',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M4 8h2.5l1.6-2.2h7.8L17.5 8H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z' />
        <circle cx='12' cy='13' r='3.3' />
      </svg>
    ),
  },
  {
    key: 'channel-hub',
    href: '/channelhub',
    title: 'ChannelHub',
    copy: 'Coming soon — creator channels and publishing tools are not open yet.',
    visitorCopy: 'Coming soon — there is no separate ChannelHub sign-up yet.',
    visitorUnavailable: true,
    tone: 'violet',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
        <rect x='3' y='5' width='18' height='13' rx='2.5' />
        <path d='m8 22 4-4 4 4' />
        <path d='m10.5 9.5 3.5 2-3.5 2v-4Z' />
      </svg>
    ),
  },
];

export default function JoinModal({ open, onClose, authenticated }: JoinModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('.mw-join-modal-option')?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className='mw-join-modal-backdrop'
      role='presentation'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className='mw-join-modal'
        role='dialog'
        aria-modal='true'
        aria-labelledby='mw-join-modal-title'
        aria-describedby='mw-join-modal-subtitle'
        ref={panelRef}
      >
        <button
          type='button'
          className='mw-join-modal-close'
          onClick={onClose}
          aria-label='Close'
          data-testid='mw-join-modal-close'
        >
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' aria-hidden='true'>
            <path d='M6 6l12 12M18 6 6 18' />
          </svg>
        </button>

        <header className='mw-join-modal-head'>
          <span className='mw-join-modal-kicker'>Join Twingface</span>
          <h2 id='mw-join-modal-title'>Join as Professional</h2>
          <p id='mw-join-modal-subtitle'>Pick where you want to start.</p>
        </header>

        <nav className='mw-join-modal-options' aria-label='Join destinations'>
          {OPTIONS.map((option) => {
            const href = authenticated ? option.href : option.visitorHref ?? option.href;
            const copy = authenticated ? option.copy : option.visitorCopy ?? option.copy;
            const unavailable = option.visitorUnavailable === true && !authenticated;
            const content = (
              <>
                <span className='mw-join-modal-icon' aria-hidden='true'>{option.icon}</span>
                <span className='mw-join-modal-copy'>
                  <strong>{option.title}</strong>
                  <span>{copy}</span>
                </span>
              </>
            );
            return unavailable ? (
              <div
                key={option.key}
                className={`mw-join-modal-option mw-join-modal-option-${option.tone} is-unavailable`}
                aria-disabled='true'
              >
                {content}
                <span className='mw-join-modal-soon'>soon</span>
              </div>
            ) : (
              <Link
                key={option.key}
                href={href}
                className={`mw-join-modal-option mw-join-modal-option-${option.tone}`}
                onClick={onClose}
              >
                {content}
                <span className='mw-join-modal-arrow' aria-hidden='true'>→</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
