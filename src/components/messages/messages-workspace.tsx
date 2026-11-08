'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SendIcon } from '@/components/dashboard/icons';

type Person = { id: string; name: string; username: string; profileImage: string | null };
type Conversation = { id: string; participantOneId: string; participantTwoId: string; lastMessageAt: string; participantOne: Person; participantTwo: Person; messages: Array<{ id: string; content: string; createdAt: string; senderId: string }> };
type Message = { id: string; content: string; createdAt: string; senderId: string; sender: Person };

function Avatar({ person }: { person: Person }) {
  const initial = person.name.trim().charAt(0).toUpperCase() || 'T';
  return <span className='message-avatar'>{person.profileImage ? <img src={person.profileImage} alt='' /> : initial}</span>;
}

export default function MessagesWorkspace({ viewerId, initialConversationId = null }: { viewerId: string; initialConversationId?: string | null }) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const selectedConversationIdRef = useRef<string | null>(initialConversationId);

  useEffect(() => { selectedConversationIdRef.current = selectedConversationId; }, [selectedConversationId]);

  useEffect(() => {
    let active = true;
    fetch('/api/conversations')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load conversations.');
        return response.json() as Promise<{ conversations: Conversation[] }>;
      })
      .then((body) => {
        if (active) {
          setConversations(body.conversations);
          setSelectedConversationId((current) => current ?? body.conversations[0]?.id ?? null);
        }
      })
      .catch(() => { if (active) setError('Unable to load conversations.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setContent('');
      setNextCursor(null);
      return;
    }
    const conversationId = selectedConversationId;
    let active = true;
    setError('');
    setMessages([]);
    setContent('');
    setNextCursor(null);
    fetch(`/api/conversations/${conversationId}/messages`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load messages.');
        return response.json() as Promise<{ messages: Message[]; nextCursor: string | null }>;
      })
      .then((body) => {
        if (active && selectedConversationIdRef.current === conversationId) {
          setMessages(body.messages);
          setNextCursor(body.nextCursor);
        }
      })
      .catch(() => {
        if (active && selectedConversationIdRef.current === conversationId) setError('Unable to load messages.');
      });
    return () => { active = false; };
  }, [selectedConversationId]);

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  const otherPerson = useMemo(() => selectedConversation ? (selectedConversation.participantOneId === viewerId ? selectedConversation.participantTwo : selectedConversation.participantOne) : null, [selectedConversation, viewerId]);

  function selectConversation(id: string) {
    setSelectedConversationId(id);
    router.replace(`/messages/${id}`);
  }

  async function loadOlderMessages() {
    if (!selectedConversationId || !nextCursor || loadingOlder) return;
    const conversationId = selectedConversationId;
    const cursor = nextCursor;
    setLoadingOlder(true);
    setError('');
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages?cursor=${encodeURIComponent(cursor)}`);
      if (!response.ok) throw new Error('Unable to load older messages.');
      const body = await response.json() as { messages: Message[]; nextCursor: string | null };
      const currentConversationId = selectedConversationIdRef.current;
      if (currentConversationId === conversationId) {
        setMessages((current) => [...body.messages, ...current]);
        setNextCursor(body.nextCursor);
      }
    } catch {
      if (selectedConversationIdRef.current === conversationId) setError('Unable to load older messages.');
    } finally {
      setLoadingOlder(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedConversationId || !content.trim() || sending) return;
    const conversationId = selectedConversationId;
    const messageContent = content.trim();
    setSending(true);
    setError('');
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent }),
      });
      if (!response.ok) throw new Error('Unable to send message.');
      const body = await response.json() as { message: Message };
      const currentConversationId = selectedConversationIdRef.current;
      if (currentConversationId === conversationId) {
        setMessages((current) => [...current, body.message]);
        setContent('');
      }
    } catch {
      if (selectedConversationIdRef.current === conversationId) setError('Unable to send message.');
    } finally {
      setSending(false);
    }
  }

  return <main className='messages-page'>
    <section className='messages-shell surface'>
      <aside className='messages-list' aria-label='Conversations'>
        <header><h1>Messages</h1></header>
        {loading ? <p className='messages-empty'>Loading conversations…</p> : conversations.length ? conversations.map((conversation) => {
          const person = conversation.participantOneId === viewerId ? conversation.participantTwo : conversation.participantOne;
          return <button type='button' key={conversation.id} className={`conversation-row${conversation.id === selectedConversationId ? ' selected' : ''}`} onClick={() => selectConversation(conversation.id)}><Avatar person={person} /><span><strong>{person.name}</strong><small>{conversation.messages[0]?.content ?? 'Start a conversation'}</small></span></button>;
        }) : <p className='messages-empty'>No conversations yet. Add a friend to start messaging.</p>}
      </aside>
      <section className='message-thread' aria-live='polite'>
        {selectedConversation && otherPerson ? <>
          <header className='message-thread-head'><Avatar person={otherPerson} /><div><strong>{otherPerson.name}</strong><small>@{otherPerson.username}</small></div></header>
          <div className='message-bubbles'>
            {nextCursor ? <button type='button' className='load-older' onClick={loadOlderMessages} disabled={loadingOlder}>{loadingOlder ? 'Loading…' : 'Load older messages'}</button> : null}
            {messages.length ? messages.map((message) => <div className={`message-bubble${message.senderId === viewerId ? ' mine' : ''}`} key={message.id}>{message.content}</div>) : <p className='messages-empty'>Say hello to {otherPerson.name}.</p>}
          </div>
          <form className='message-compose' onSubmit={sendMessage}><input aria-label='Write a message' value={content} onChange={(event) => setContent(event.target.value)} maxLength={1000} disabled={sending} placeholder='Write a message…' /><button type='submit' aria-label='Send message' disabled={sending || !content.trim()}><SendIcon size={18} /><span>Send</span></button></form>
        </> : <div className='message-placeholder'><strong>Select a conversation</strong><span>Messages are available only between accepted friends.</span></div>}
      </section>
    </section>
    {error ? <p className='messages-error' role='alert'>{error}</p> : null}
  </main>;
}
