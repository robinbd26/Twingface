'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MarketplaceInquiry({ listingId, disabled }: { listingId: string; disabled: boolean }) {
  const router = useRouter(); const [content, setContent] = useState('Is this available?'); const [pending, setPending] = useState(false); const [error, setError] = useState('');
  async function send() {
    setPending(true); setError('');
    try {
      const response = await fetch(`/api/marketplace/${listingId}/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) }); const body = await response.json().catch(() => null);
      if (!response.ok) { setError(body?.error ?? 'Unable to send message.'); return; } router.push(`/messages/${body.conversation.id}`);
    } catch { setError('Unable to send message. Check your connection and try again.'); } finally { setPending(false); }
  }
  return <section className='marketplace-inquiry'><label>Message seller<textarea value={content} disabled={disabled || pending} onChange={(event) => setContent(event.target.value)} maxLength={1000} /></label>{error ? <p role='alert' className='marketplace-error'>{error}</p> : null}<button type='button' disabled={disabled || pending || !content.trim()} className='fb-btn fb-btn-primary' onClick={() => void send()}>{disabled ? 'Sold out' : pending ? 'Sending…' : 'Message seller'}</button></section>;
}
