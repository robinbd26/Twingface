'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BellIcon,
  CheckIcon,
  CloseIcon,
  SpeakerOffIcon,
  SpeakerOnIcon,
} from './icons';
import { describeNotification, type NotificationType } from '@/lib/notification';
import type { RealtimeNotification } from '@/lib/realtime';
import {
  playNotificationSound,
  readNotificationSoundPreference,
  writeNotificationSoundPreference,
} from '@/lib/notification-sound';

// Reliability backstop for the SSE stream (dropped connection, multi-instance
// deploy). SSE delivers instantly on a healthy connection; this modest poll
// keeps the badge correct without much per-tab request volume.
const POLL_INTERVAL_MS = 30_000;

type BellNotification = RealtimeNotification;

// Where each notification type should send the user when clicked.
function hrefFor(notification: BellNotification): string {
  if (notification.actor.username) return `/${notification.actor.username}`;
  return '/dashboard';
}

function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Keep the newest-first list deduped by id and capped so it stays bounded.
function mergeById(current: BellNotification[], incoming: BellNotification[]): BellNotification[] {
  const seen = new Set(current.map((item) => item.id));
  const fresh = incoming.filter((item) => !seen.has(item.id));
  if (!fresh.length) return current;
  return [...fresh, ...current]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<BellNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundHydrated, setSoundHydrated] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // Mirrors the newest id so the polling fallback can chime only for arrivals
  // it has not already announced, without closing over stale state.
  const latestIdRef = useRef<string | null>(null);

  // Read the persisted sound preference after mount (localStorage is not
  // available during SSR, so this avoids a hydration mismatch).
  useEffect(() => {
    const preference = readNotificationSoundPreference();
    setSoundEnabled(preference.enabled);
    setSoundHydrated(true);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=30');
      if (!response.ok) return;
      const body = await response.json() as { notifications: BellNotification[]; unreadCount: number };
      setNotifications(body.notifications);
      setUnreadCount(body.unreadCount);
      // Seed the "seen" marker from the first load so later arrivals chime.
      latestIdRef.current = body.notifications[0]?.id ?? null;
    } catch {
      /* transient; retry on the next poll / SSE event */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Close the dropdown on an outside click or Escape, like the profile menu.
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-notification-area]')) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Live delivery: SSE pushes new notifications the instant they are created.
  useEffect(() => {
    const source = new EventSource('/api/notifications/stream');
    source.onmessage = (event) => {
      let parsed: { type?: string; notification?: BellNotification } | null = null;
      try { parsed = JSON.parse(event.data) as { type?: string; notification?: BellNotification }; } catch { return; }
      if (parsed?.type !== 'notification' || !parsed.notification) return;
      const incoming = parsed.notification;
      // Direct messages belong exclusively to the Messages inbox. Ignore a
      // legacy MESSAGE notification if one is ever published by an older tab.
      if (incoming.type === 'MESSAGE') return;
      // Chime only for arrivals after the first load, and only when enabled.
      const isNew = latestIdRef.current !== null && incoming.id !== latestIdRef.current;
      setNotifications((current) => mergeById(current, [incoming]));
      setUnreadCount((count) => count + 1);
      latestIdRef.current = incoming.id;
      if (isNew && soundEnabled) playNotificationSound();
    };
    return () => source.close();
  }, [soundEnabled]);

  // Polling fallback: also the safety net that replays the chime when a
  // notification was missed while the SSE socket was briefly down.
  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch('/api/notifications?limit=30');
        if (!response.ok) return;
        const body = await response.json() as { notifications: BellNotification[]; unreadCount: number };
        const nextTop = body.notifications[0]?.id ?? null;
        setNotifications(body.notifications);
        setUnreadCount(body.unreadCount);
        if (latestIdRef.current && nextTop && nextTop !== latestIdRef.current && soundEnabled) {
          playNotificationSound();
        }
        latestIdRef.current = nextTop;
      } catch {
        /* transient; retry on the next tick */
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [soundEnabled]);

  async function markAllRead() {
    // Optimistically clear the badge, then persist.
    setUnreadCount(0);
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (response.ok) {
        const body = await response.json() as { unreadCount: number };
        setUnreadCount(body.unreadCount);
      }
    } catch {
      /* retry on next refresh */
    }
  }

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    writeNotificationSoundPreference(next);
    // Play a preview chime when turning sound ON so the choice is audible.
    if (next) playNotificationSound();
  }

  const badge = unreadCount > 9 ? '9+' : String(unreadCount);


  return (
    <div className='notification-area' data-notification-area ref={rootRef}>
      <button
        type='button'
        className='round-action notification-trigger'
        aria-label='Notifications'
        aria-expanded={open}
        aria-haspopup='dialog'
        data-testid='button-notifications'
        title='Notifications'
        onClick={() => setOpen((value) => !value)}
      >
        <BellIcon size={19} />
        {unreadCount > 0 ? (
          <span className='notification-badge' data-testid='text-notification-badge'>{badge}</span>
        ) : null}
      </button>

      {open ? (
        <div className='notification-panel surface menu-shadow page-enter' role='dialog' aria-label='Notifications' data-testid='panel-notifications'>
          <header className='notification-panel-head'>
            <h2>Notifications</h2>
            <div className='notification-head-actions'>
              <button
                type='button'
                className='notification-icon-button'
                aria-pressed={soundEnabled}
                aria-label={soundEnabled ? 'Turn notification sound off' : 'Turn notification sound on'}
                title={soundEnabled ? 'Notification sound: on' : 'Notification sound: off'}
                data-testid='button-toggle-notification-sound'
                onClick={toggleSound}
              >
                {soundHydrated && soundEnabled ? <SpeakerOnIcon size={17} /> : <SpeakerOffIcon size={17} />}
              </button>
              <button
                type='button'
                className='notification-icon-button'
                aria-label='Mark all as read'
                title='Mark all as read'
                data-testid='button-mark-all-read'
                disabled={unreadCount === 0}
                onClick={markAllRead}
              >
                <CheckIcon size={17} />
              </button>
              <button
                type='button'
                className='notification-icon-button'
                aria-label='Close notifications'
                title='Close'
                data-testid='button-close-notifications'
                onClick={() => setOpen(false)}
              >
                <CloseIcon size={16} />
              </button>
            </div>
          </header>

          <div className='notification-list'>
            {notifications.length ? notifications.map((item) => (
              <Link
                key={item.id}
                href={hrefFor(item)}
                className={`notification-item${item.isRead ? '' : ' unread'}`}
                data-testid={`notification-item-${item.id}`}
                onClick={() => setOpen(false)}
              >
                <span className='avatar avatar-robin notification-avatar' aria-hidden='true'>
                  {item.actor.profileImage ? <img className='avatar-photo' src={item.actor.profileImage} alt='' /> : (item.actor.name.trim().charAt(0).toUpperCase() || 'T')}
                </span>
                <span className='notification-copy'>
                  <span className='notification-text'>{describeNotification(item.type as NotificationType, item.actor.name)}</span>
                  <span className='notification-time'>{relativeTime(item.createdAt)}</span>
                </span>
                {item.isRead ? null : <span className='notification-dot' aria-label='Unread' />}
              </Link>
            )) : (
              <p className='notification-empty' data-testid='text-notifications-empty'>You have no notifications yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

