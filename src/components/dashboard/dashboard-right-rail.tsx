'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SearchIcon, UsersIcon } from './icons';
import { useMessenger } from '@/components/messages/messenger-context';
import { adDomain } from '@/lib/ads';
import { formatLastActive } from '@/lib/presence';

type Ad = { id: string; title: string; description: string | null; imageUrl: string; destinationUrl: string };
type Person = { id: string; name: string; username: string; profileImage: string | null };
type FriendRequest = { id: string; createdAt: string; requesterId: string; user: Person; mutualFriends: number };
type Contact = Person & { isOnline: boolean; lastActiveAt: string | null };

function Avatar({ person, online = false }: { person: Person; online?: boolean }) {
  const initial = person.name.trim().charAt(0).toUpperCase() || 'T';
  return (
    <span className='contact-avatar-wrap'>
      <span className='avatar' aria-hidden='true'>{person.profileImage ? <img className='avatar-photo' src={person.profileImage} alt='' /> : initial}</span>
      {online ? <i className='online-dot' /> : null}
    </span>
  );
}

function mutualLabel(count: number): string {
  if (count <= 0) return 'No mutual friends';
  if (count === 1) return '1 mutual friend';
  return `${count} mutual friends`;
}

export default function DashboardRightRail() {
  const { openChat } = useMessenger();
  const [ads, setAds] = useState<Ad[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/ads/sponsored').then((r) => (r.ok ? r.json() : { ads: [] })) as Promise<{ ads: Ad[] }>,
      fetch('/api/friends/requests/pending').then((r) => (r.ok ? r.json() : { requests: [] })) as Promise<{ requests: FriendRequest[] }>,
      fetch('/api/friends/contacts').then((r) => (r.ok ? r.json() : { contacts: [], onlineCount: 0 })) as Promise<{ contacts: Contact[]; onlineCount: number }>,
    ]).then(([adsBody, requestsBody, contactsBody]) => {
      if (!active) return;
      setAds(adsBody.ads ?? []);
      setRequests(requestsBody.requests ?? []);
      setContacts(contactsBody.contacts ?? []);
      setOnlineCount(contactsBody.onlineCount ?? 0);
    }).catch(() => { /* sidebar widgets degrade quietly */ });
    return () => { active = false; };
  }, []);

  async function respondToRequest(id: string, action: 'accept' | 'reject') {
    setRequests((current) => current.filter((request) => request.id !== id));
    await fetch(`/api/friends/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }).catch(() => { /* optimistic update already applied */ });
  }

  const visible = contacts.filter((contact) => contact.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <aside className='right-rail' aria-label='Sponsored and contacts'>
      {ads.length ? (
        <section data-testid='sponsored-section'>
          <div className='sponsored-heading'>
            <h2>Sponsored</h2>
            <span>AD</span>
          </div>
          {ads.map((ad) => (
            <a key={ad.id} className='sponsored-card' href={ad.destinationUrl} target='_blank' rel='noreferrer noopener' data-testid={`sponsored-${ad.id}`}>
              <span className='sponsored-visual'><img src={ad.imageUrl} alt='' /></span>
              <span className='sponsored-copy'>
                <strong>{ad.title}</strong>
                <small>{adDomain(ad.destinationUrl)}</small>
              </span>
            </a>
          ))}
          <div className='right-divider' />
        </section>
      ) : null}

      {requests.length ? (
        <section data-testid='friend-requests-widget'>
          <div className='contacts-heading'>
            <h2>Friend requests <span>{requests.length}</span></h2>
          </div>
          <div className='request-list'>
            {requests.map((request) => (
              <div className='request-card' key={request.id}>
                <Avatar person={request.user} />
                <div className='request-meta'>
                  <strong>{request.user.name}</strong>
                  <small>{mutualLabel(request.mutualFriends)}</small>
                </div>
                <div className='request-actions'>
                  <button type='button' className='request-confirm' onClick={() => respondToRequest(request.id, 'accept')} data-testid={`request-confirm-${request.id}`}>Confirm</button>
                  <button type='button' className='request-delete' onClick={() => respondToRequest(request.id, 'reject')} data-testid={`request-delete-${request.id}`}>Delete</button>
                </div>
              </div>
            ))}
          </div>
          <Link className='see-all-link' href='/friends/requests'>See all</Link>
          <div className='right-divider' />
        </section>
      ) : null}

      <section>
        <div className='contacts-heading'>
          <h2>Contacts <span>{contacts.length}</span></h2>
          <div>
            <button type='button' aria-label='Search contacts' data-testid='button-contact-search' onClick={() => setSearchOpen((open) => !open)}>
              <SearchIcon size={17} />
            </button>
          </div>
        </div>
        {searchOpen ? (
          <div className='contact-search'>
            <SearchIcon size={15} />
            <input aria-label='Search contacts' data-testid='input-contact-search' autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Find a friend' />
          </div>
        ) : null}
        <div className='contact-list'>
          {visible.map((contact) => (
            <button key={contact.id} type='button' className='contact-link' data-testid={`contact-${contact.username}`} onClick={() => openChat(contact)}>
              <Avatar person={contact} online={contact.isOnline} />
              <span>{contact.name}</span>
              {contact.isOnline ? null : contact.lastActiveAt ? <small className='contact-status'>{formatLastActive(contact.lastActiveAt)}</small> : null}
            </button>
          ))}
        </div>
        <div className='circle-note'>
          <span className='note-mark'><UsersIcon size={16} /></span>
          <span>
            <strong>Your circle, close by.</strong>
            <small>{onlineCount} {onlineCount === 1 ? 'friend is' : 'friends are'} online now</small>
          </span>
        </div>
      </section>
    </aside>
  );
}
