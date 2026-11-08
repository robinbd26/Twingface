'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function MarketplaceOwnerActions({ listingId, status }: { listingId: string; status: 'AVAILABLE' | 'SOLD_OUT' }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState('');
  async function request(method: 'PATCH' | 'DELETE') {
    if (method === 'DELETE' && !window.confirm('Delete this listing?')) return; setPending(true); setError('');
    try {
      const response = await fetch(`/api/marketplace/${listingId}`, method === 'PATCH' ? { method, body: (() => { const form = new FormData(); form.set('status', status === 'AVAILABLE' ? 'SOLD_OUT' : 'AVAILABLE'); return form; })() } : { method });
      if (!response.ok) { setError('Unable to update this listing. Please try again.'); return; }
      router.push(method === 'DELETE' ? '/marketplace/mine' : `/marketplace/${listingId}`); router.refresh();
    } catch { setError('Unable to update this listing. Check your connection and try again.'); } finally { setPending(false); }
  }
  return <div className='marketplace-owner-actions'><Link className='fb-btn fb-btn-ghost' href={`/marketplace/${listingId}/edit`}>Edit</Link><button className='fb-btn fb-btn-ghost' disabled={pending} onClick={() => void request('PATCH')}>{status === 'AVAILABLE' ? 'Mark sold out' : 'Mark available'}</button><button className='fb-btn fb-btn-danger' disabled={pending} onClick={() => void request('DELETE')}>Delete</button>{error ? <p className='marketplace-error' role='alert'>{error}</p> : null}</div>;
}
