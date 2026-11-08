'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChatIcon, CloseIcon, SpeakerOffIcon, SpeakerOnIcon } from './icons';
import { playMessageSound, readMessageSoundPreference, writeMessageSoundPreference } from '@/lib/message-sound';
import type { RealtimeMessage } from '@/lib/realtime';

type Person = { id: string; name: string; username: string; profileImage: string | null };
type Conversation = { id: string; participantOneId: string; participantTwoId: string; participantOne: Person; participantTwo: Person; messages: Array<{ id: string; content: string; createdAt: string; senderId: string }>; _count: { messages: number } };

function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

export default function MessageInbox({ viewerId }: { viewerId?: string }) {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundHydrated, setSoundHydrated] = useState(false);
  const loadedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations?limit=6');
      if (!response.ok) return;
      const body = await response.json() as { conversations: Conversation[]; unreadCount: number };
      setConversations(body.conversations);
      setUnreadCount(body.unreadCount);
      loadedRef.current = true;
    } catch { /* retry after a future event */ }
  }, []);

  useEffect(() => {
    const preference = readMessageSoundPreference();
    setSoundEnabled(preference.enabled);
    setSoundHydrated(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('[data-message-inbox-area]')) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('click', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('click', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    const source = new EventSource('/api/messages/stream');
    source.onmessage = (event) => {
      let payload: { type?: string; message?: RealtimeMessage } | null = null;
      try { payload = JSON.parse(event.data) as { type?: string; message?: RealtimeMessage }; } catch { return; }
      if (payload?.type !== 'message' || !payload.message || !viewerId || payload.message.senderId === viewerId) return;
      const shouldChime = loadedRef.current && soundEnabled;
      void refresh();
      if (shouldChime) playMessageSound();
    };
    return () => source.close();
  }, [refresh, soundEnabled, viewerId]);

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    writeMessageSoundPreference(next);
    if (next) playMessageSound();
  }

  const badge = unreadCount > 9 ? '9+' : String(unreadCount);
  return <div className='message-inbox-area' data-message-inbox-area>
    <button type='button' className='round-action message-inbox-trigger' aria-label='Messages' title='Messages' aria-expanded={open} aria-haspopup='dialog' data-testid='button-messages' onClick={() => setOpen((value) => !value)}>
      <ChatIcon size={19} />
      {unreadCount > 0 ? <span className='notification-badge' data-testid='text-message-badge'>{badge}</span> : null}
    </button>
    {open ? <div className='message-inbox-panel surface menu-shadow page-enter' role='dialog' aria-label='Messages' data-testid='panel-messages'>
      <header className='notification-panel-head'><h2>Messages</h2><div className='notification-head-actions'>
        <button type='button' className='notification-icon-button' aria-pressed={soundEnabled} aria-label={soundEnabled ? 'Turn message sound off' : 'Turn message sound on'} title={soundEnabled ? 'Message sound: on' : 'Message sound: off'} data-testid='button-toggle-message-sound' onClick={toggleSound}>{soundHydrated && soundEnabled ? <SpeakerOnIcon size={17} /> : <SpeakerOffIcon size={17} />}</button>
        <button type='button' className='notification-icon-button' aria-label='Close messages' title='Close' onClick={() => setOpen(false)}><CloseIcon size={16} /></button>
      </div></header>
      <div className='message-inbox-list'>{conversations.length ? conversations.map((conversation) => {
        const person = conversation.participantOneId === viewerId ? conversation.participantTwo : conversation.participantOne;
        const latest = conversation.messages[0];
        const unread = conversation._count.messages;
        return <Link key={conversation.id} href={`/messages/${conversation.id}`} className={`message-inbox-item${unread ? ' unread' : ''}`} onClick={() => setOpen(false)}>
          <span className='avatar avatar-robin notification-avatar' aria-hidden='true'>{person.profileImage ? <img className='avatar-photo' src={person.profileImage} alt='' /> : (person.name.trim().charAt(0).toUpperCase() || 'T')}</span>
          <span className='message-inbox-copy'><strong>{person.name}</strong><small>{latest?.content ?? 'Start a conversation'}</small><time>{latest ? relativeTime(latest.createdAt) : ''}</time></span>
          {unread ? <span className='notification-dot' aria-label={`${unread} unread messages`} /> : null}
        </Link>;
      }) : <p className='notification-empty'>No messages yet.</p>}</div>
      <Link href='/messages' className='message-inbox-all' onClick={() => setOpen(false)}>See all messages</Link>
    </div> : null}
  </div>;
}
