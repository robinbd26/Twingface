'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RelationshipState } from '@/lib/relationship';
import { requestOpenChat } from '@/components/messages/messenger-context';
import { ChatIcon, UsersIcon } from '@/components/dashboard/icons';

type PublicProfileActionsProps = { username: string; profileId: string; profileName: string; profileImage: string | null; relationship: RelationshipState; friendshipId: string | null; isSignedIn: boolean };

async function readError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error ?? fallback;
}

export default function PublicProfileActions({ username, profileId, profileName, profileImage, relationship: initialRelationship, friendshipId, isSignedIn }: PublicProfileActionsProps) {
  const router = useRouter();
  const [relationship, setRelationship] = useState<RelationshipState>(initialRelationship);
  const [requestId, setRequestId] = useState(friendshipId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function sendRequest() {
    setPending(true); setError('');
    try {
      const response = await fetch('/api/friends/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
      if (!response.ok) throw new Error(await readError(response, 'Unable to send friend request.'));
      const body = await response.json() as { request: { id: string } };
      setRequestId(body.request.id); setRelationship('OUTGOING_PENDING'); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to send friend request.'); } finally { setPending(false); }
  }

  async function updateRequest(action: 'accept' | 'reject') {
    if (!requestId) return;
    setPending(true); setError('');
    try {
      const response = await fetch(`/api/friends/requests/${requestId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      if (!response.ok) throw new Error(await readError(response, 'Unable to update friend request.'));
      setRelationship(action === 'accept' ? 'ACCEPTED' : 'NONE');
      if (action === 'reject') setRequestId(null);
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update friend request.'); } finally { setPending(false); }
  }

  async function removeRequest() {
    if (!requestId) return;
    setPending(true); setError('');
    try {
      const response = await fetch(`/api/friends/requests/${requestId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await readError(response, 'Unable to update friendship.'));
      setRequestId(null); setRelationship('NONE'); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update friendship.'); } finally { setPending(false); }
  }

  function openMessage() {
    setError('');
    requestOpenChat({ id: profileId, name: profileName, username, profileImage });
  }

  if (!isSignedIn) return <p className='public-action-note'>Sign in to connect with {username}.</p>;
  return <div className='public-profile-actions'>
    {relationship === 'NONE' ? <button type='button' className='fb-btn fb-btn-primary' onClick={sendRequest} disabled={pending}><UsersIcon size={17} />{pending ? 'Sending…' : 'Add friend'}</button> : null}
    {relationship === 'OUTGOING_PENDING' ? <button type='button' className='fb-btn fb-btn-ghost' onClick={removeRequest} disabled={pending}>{pending ? 'Updating…' : 'Cancel request'}</button> : null}
    {relationship === 'INCOMING_PENDING' ? <><button type='button' className='fb-btn fb-btn-primary' onClick={() => updateRequest('accept')} disabled={pending}>{pending ? 'Updating…' : 'Confirm'}</button><button type='button' className='fb-btn fb-btn-ghost' onClick={() => updateRequest('reject')} disabled={pending}>Delete</button></> : null}
    {relationship === 'ACCEPTED' ? <button type='button' className='fb-btn fb-btn-ghost' onClick={removeRequest} disabled={pending}><UsersIcon size={17} /> Friends</button> : null}
    <button type='button' className='fb-btn fb-btn-ghost' onClick={openMessage} disabled={pending || relationship !== 'ACCEPTED'} title={relationship === 'ACCEPTED' ? 'Message' : 'Become friends to message'}><ChatIcon size={17} /> Message</button>
    {error ? <p className='public-action-error' role='alert'>{error}</p> : null}
  </div>;
}
