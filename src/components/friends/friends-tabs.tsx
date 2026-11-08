'use client';

import { useState } from 'react';
import Link from 'next/link';

type FriendUser = { id: string; name: string; username: string; profileImage: string | null };
type FriendRequest = { id: string; user: FriendUser; mutualFriends: number };

function Avatar({ user }: { user: FriendUser }) {
  const initial = user.name.trim().charAt(0).toUpperCase() || 'T';
  return user.profileImage
    ? <img className='fb-friend-photo avatar-photo' src={user.profileImage} alt='' />
    : <span className='fb-friend-photo fb-avatar-fallback' aria-hidden='true'>{initial}</span>;
}

export default function FriendsTabs({ requests: initialRequests, friends }: { requests: FriendRequest[]; friends: FriendUser[] }) {
  const [tab, setTab] = useState<'requests' | 'all'>('requests');
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function respond(friendshipId: string, action: 'accept' | 'decline') {
    setBusyId(friendshipId);
    try {
      const response = await fetch(`/api/friends/requests/${friendshipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error('Request failed.');
      setRequests((current) => current.filter((entry) => entry.id !== friendshipId));
    } catch {
      /* keep the row so the user can retry */
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className='fb-card surface'>
      <div className='fb-tabs' role='tablist' aria-label='Friends sections'>
        <button type='button' role='tab' aria-selected={tab === 'requests'} className={`fb-tab${tab === 'requests' ? ' active' : ''}`} onClick={() => setTab('requests')}>
          Requests{requests.length ? ` (${requests.length})` : ''}
        </button>
        <button type='button' role='tab' aria-selected={tab === 'all'} className={`fb-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
          All friends ({friends.length})
        </button>
      </div>

      {tab === 'requests' ? (
        requests.length ? (
          <div className='fb-friend-grid'>
            {requests.map((entry) => (
              <div className='fb-friend' key={entry.id}>
                <Link href={`/${entry.user.username}`}><Avatar user={entry.user} /></Link>
                <p><Link className='page-card-link' href={`/${entry.user.username}`}>{entry.user.name}</Link></p>
                <small className='fb-friends-count'>{entry.mutualFriends} mutual</small>
                <div className='fb-actions'>
                  <button type='button' className='fb-btn fb-btn-primary' disabled={busyId === entry.id} onClick={() => void respond(entry.id, 'accept')}>Confirm</button>
                  <button type='button' className='fb-btn fb-btn-ghost' disabled={busyId === entry.id} onClick={() => void respond(entry.id, 'decline')}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className='fb-friend-empty'>No pending requests.</p>
      ) : friends.length ? (
        <div className='fb-friend-grid'>
          {friends.map((friend) => (
            <Link className='fb-friend' href={`/${friend.username}`} key={friend.id}>
              <Avatar user={friend} />
              <p>{friend.name}</p>
            </Link>
          ))}
        </div>
      ) : <p className='fb-friend-empty'>No friends yet.</p>}
    </div>
  );
}
