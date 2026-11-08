'use client';

import Link from 'next/link';
import { useState } from 'react';
import ProfileMediaUploader from '@/components/profile/profile-media-uploader';

type ProfileFormData = { name: string; username: string; bio: string | null; profileImage: string | null; coverImage: string | null };

export default function ProfileForm({ profile }: { profile: ProfileFormData }) {
  const [form, setForm] = useState({ name: profile.name, username: profile.username, bio: profile.bio ?? '', profileImage: profile.profileImage ?? '', coverImage: profile.coverImage ?? '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent) { event.preventDefault(); setLoading(true); setMessage(''); try { const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.fields ? Object.values(data.fields).flat()[0] as string : data.error); setMessage('Profile updated successfully.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update your profile.'); } finally { setLoading(false); } }
  return <form onSubmit={submit}>
    <label className='l' htmlFor='profile-name'>Name</label><div className='f'><input id='profile-name' value={form.name} onChange={(e) => update('name', e.target.value)} required /></div>
    <label className='l' htmlFor='profile-username'>Username</label><div className='f'><input id='profile-username' value={form.username} onChange={(e) => update('username', e.target.value)} required /></div>
    <label className='l' htmlFor='profile-bio'>Bio</label><div className='f'><input id='profile-bio' value={form.bio} onChange={(e) => update('bio', e.target.value)} maxLength={500} /></div>
    <div className='profile-media-edit-actions'><ProfileMediaUploader kind='profile' onUploaded={(updated) => update('profileImage', updated.profileImage ?? '')} /><ProfileMediaUploader kind='cover' onUploaded={(updated) => update('coverImage', updated.coverImage ?? '')} /></div>
    <label className='l' htmlFor='profile-image'>Profile image URL <small>HTTPS only</small></label><div className='f'><input id='profile-image' type='url' value={form.profileImage} onChange={(e) => update('profileImage', e.target.value)} /></div>
    <label className='l' htmlFor='cover-image'>Cover image URL <small>HTTPS only</small></label><div className='f'><input id='cover-image' type='url' value={form.coverImage} onChange={(e) => update('coverImage', e.target.value)} /></div>
    <button className='btn' disabled={loading}><span>{loading ? 'Saving…' : 'Save profile'}</span><span>→</span></button><p className='msg' role='status'>{message}</p><Link className='link' href='/profile'>Cancel</Link>
  </form>;
}
