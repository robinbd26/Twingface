'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { SendIcon, CloseIcon, PhoneIcon, VideoIcon } from '@/components/dashboard/icons';
import type { ChatFriend } from './messenger-context';
import { useCall } from './call-context';

type Message = {
  id: string;
  content: string;
  attachments: string[];
  isRead: boolean;
  createdAt: string;
  senderId: string;
  sender?: { profileImage: string | null };
};

// How often the chat window polls the database for messages the SSE stream may
// have missed (dropped connection, or a multi-instance deployment where the
// in-process fan-out cannot reach this tab). SSE still delivers instantly on a
// healthy connection; this is the reliability backstop, so a modest interval is
// plenty and keeps per-tab request volume low.
const POLL_INTERVAL_MS = 15_000;

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'T';
}

function timeLabel(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Append new messages, deduped by id, kept in chronological order.
function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const seen = new Set(current.map((message) => message.id));
  const fresh = incoming.filter((message) => !seen.has(message.id));
  if (!fresh.length) return current;
  return [...current, ...fresh].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export default function ChatWindow({ friend, onClose }: { friend: ChatFriend; onClose: () => void }) {
  const { startCall, supported } = useCall();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Mirrors the newest message's timestamp so the polling interval can request
  // everything newer without closing over stale state.
  const latestRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/messages/${friend.id}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load messages.');
        return response.json() as Promise<{ messages: Message[] }>;
      })
      .then((body) => {
        if (!active) return;
        setMessages(body.messages);
        latestRef.current = body.messages.at(-1)?.createdAt ?? null;
      })
      .catch(() => { /* history may be empty before the first message */ });
    return () => { active = false; };
  }, [friend.id]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, minimised]);

  // Live delivery: Server-Sent Events push new messages as they arrive.
  useEffect(() => {
    const source = new EventSource('/api/messages/stream');
    source.onmessage = (event) => {
      let parsed: { type?: string; message?: Message } | null = null;
      try { parsed = JSON.parse(event.data) as { type?: string; message?: Message }; } catch { return; }
      if (parsed?.type !== 'message' || !parsed.message) return;
      const incoming = parsed.message;
      setMessages((current) => {
        const next = mergeMessages(current, [incoming]);
        latestRef.current = next.at(-1)?.createdAt ?? latestRef.current;
        return next;
      });
    };
    return () => source.close();
  }, []);

  // Reliability fallback: poll the database for anything the SSE stream missed.
  useEffect(() => {
    if (minimised) return;
    const timer = setInterval(async () => {
      const since = latestRef.current;
      if (!since) return; // history not loaded yet — nothing to diff against.
      try {
        const response = await fetch(`/api/messages/${friend.id}?since=${encodeURIComponent(since)}&limit=50`);
        if (!response.ok) return;
        const body = await response.json() as { messages: Message[] };
        if (!body.messages?.length) return;
        setMessages((current) => {
          const next = mergeMessages(current, body.messages);
          latestRef.current = next.at(-1)?.createdAt ?? latestRef.current;
          return next;
        });
      } catch { /* transient; retry on the next tick */ }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [friend.id, minimised]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: friend.id, messageText: text }),
      });
      if (!response.ok) throw new Error('Unable to send message.');
      const body = await response.json() as { message: Message };
      setMessages((current) => {
        const next = mergeMessages(current, [body.message]);
        latestRef.current = next.at(-1)?.createdAt ?? latestRef.current;
        return next;
      });
      setContent('');
    } catch {
      /* keep the typed message so the user can retry */
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={`chat-window${minimised ? ' minimised' : ''}`} aria-label={`Chat with ${friend.name}`} data-testid={`chat-window-${friend.username}`}>
      <header className='chat-window-head'>
        <span className='chat-window-avatar'>{friend.profileImage ? <img className='avatar-photo' src={friend.profileImage} alt='' /> : initials(friend.name)}</span>
        <div className='chat-window-title'>
          <strong>{friend.name}</strong>
          <small>Active now</small>
        </div>
        <div className='chat-window-actions'>
          <button type='button' aria-label='Start voice call' title='Voice call' data-testid='button-voice-call' disabled={!supported} onClick={() => void startCall(friend, 'audio')}><PhoneIcon size={16} /></button>
          <button type='button' aria-label='Start video call' title='Video call' data-testid='button-video-call' disabled={!supported} onClick={() => void startCall(friend, 'video')}><VideoIcon size={16} /></button>
          <button type='button' aria-label='Minimise chat' title='Minimise' onClick={() => setMinimised((value) => !value)}>
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><path d='M5 12h14' /></svg>
          </button>
          <button type='button' aria-label='Close chat' title='Close' onClick={onClose}><CloseIcon size={16} /></button>
        </div>
      </header>
      {minimised ? null : (
        <>
          <div className='chat-window-body' ref={bodyRef}>
            {messages.length ? messages.map((message) => (
              <div className={`chat-bubble${message.senderId === friend.id ? '' : ' mine'}`} key={message.id}>
                <span>{message.content}</span>
                <time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time>
              </div>
            )) : <p className='chat-window-empty'>Say hello to {friend.name}.</p>}
          </div>
          <form className='chat-window-foot' onSubmit={sendMessage}>
            <button type='button' aria-label='Add emoji' title='Emoji'>😊</button>
            <input aria-label='Write a message' value={content} onChange={(event) => setContent(event.target.value)} maxLength={1000} disabled={sending} placeholder='Aa' />
            <button type='submit' aria-label='Send message' disabled={sending || !content.trim()}><SendIcon size={16} /></button>
          </form>
        </>
      )}
    </section>
  );
}
