'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function GroupActions({ handle, privacy, status }: { handle: string; privacy: string; status?: string | null }) {
  const router = useRouter(); const [pending, setPending] = useState(false);
  if (status === 'APPROVED') return <span className='fb-btn'>Joined</span>;
  return <button className='fb-btn fb-btn-primary' disabled={pending} onClick={async () => { setPending(true); await fetch(`/api/groups/${handle}/membership`, { method: 'POST' }); router.refresh(); }}>
    {pending ? 'Please wait…' : privacy === 'PRIVATE' ? 'Request to join' : 'Join group'}
  </button>;
}
