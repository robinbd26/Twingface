'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GroupForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(form: FormData) {
    setPending(true); setError('');
    const body = Object.fromEntries(form.entries());
    const response = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => null);
    setPending(false);
    if (!response.ok) return setError(data?.error ?? 'Unable to create your group.');
    router.push(`/groups/${data.group.handle}`);
  }
  return <form action={submit} className='fb-card surface group-form'>
    <label>Name<input name='name' required minLength={3} maxLength={80} /></label>
    <label>Group handle<input name='handle' required minLength={3} maxLength={60} /></label>
    <label>Description<textarea name='description' maxLength={500} /></label>
    <label>Privacy<select name='privacy' defaultValue='PUBLIC'><option value='PUBLIC'>Public</option><option value='PRIVATE'>Private</option></select></label>
    <label>Who can post?<select name='postingPolicy' defaultValue='MEMBERS'><option value='MEMBERS'>Members</option><option value='ADMINS_ONLY'>Admins and moderators</option></select></label>
    <label>Cover image URL (optional)<input name='coverImage' type='url' /></label>
    {error ? <p className='fb-intro-error' role='alert'>{error}</p> : null}
    <button className='fb-btn fb-btn-primary' disabled={pending}>{pending ? 'Creating…' : 'Create group'}</button>
  </form>;
}
