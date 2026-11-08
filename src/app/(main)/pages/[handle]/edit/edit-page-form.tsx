'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { PAGE_CATEGORIES } from '@/lib/constants';
import type { SafePage } from '@/lib/page';

export default function EditPageForm({ page }: { page: SafePage }) {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: page.name, handle: page.handle, category: page.category, bio: page.bio ?? '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  function errorMessage(data: { fields?: Record<string, string[]>; error?: string } | null, fallback: string) {
    if (data?.fields) return Object.values(data.fields).flat()[0] ?? fallback;
    return data?.error ?? fallback;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`/api/pages/${page.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(data, 'Unable to update your page.'));
      setMessage('Page updated.');
      router.push(`/pages/${form.handle.toLowerCase()}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update your page.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadMedia(kind: 'avatar' | 'cover', image: File | null) {
    if (!image) return;
    setMessage('');
    const formData = new FormData();
    formData.set(kind, image);
    try {
      const response = await fetch(`/api/pages/${page.id}`, { method: 'PATCH', body: formData });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(data, 'Unable to upload your image.'));
      setMessage(`${kind === 'avatar' ? 'Profile' : 'Cover'} image updated.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload your image.');
    } finally {
      const inputRef = kind === 'avatar' ? avatarInputRef : coverInputRef;
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove() {
    if (!window.confirm('Delete this page permanently? Its posts will be removed too.')) return;
    setDeleting(true);
    setMessage('');
    try {
      const response = await fetch(`/api/pages/${page.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(errorMessage(data, 'Unable to delete your page.'));
      }
      router.push('/pages');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete your page.');
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label className='l' htmlFor='page-name'>Page name</label>
      <div className='f'><input id='page-name' value={form.name} onChange={(event) => update('name', event.target.value)} maxLength={100} required /></div>

      <label className='l' htmlFor='page-handle'>Handle <small>letters, numbers, dots, or hyphens</small></label>
      <div className='f'><input id='page-handle' value={form.handle} onChange={(event) => update('handle', event.target.value)} maxLength={30} required /></div>

      <label className='l' htmlFor='page-category'>Category</label>
      <div className='sel'>
        <select id='page-category' value={form.category} onChange={(event) => update('category', event.target.value)} required>
          <option value=''>Select a category</option>
          {PAGE_CATEGORIES.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <label className='l' htmlFor='page-bio'>Bio <small>optional</small></label>
      <div className='f'><input id='page-bio' value={form.bio} onChange={(event) => update('bio', event.target.value)} maxLength={500} /></div>

      <label className='l' htmlFor='page-avatar-input'>Profile image <small>JPEG, PNG, WebP, or GIF · up to 5 MB</small></label>
      <div className='f'>
        <input
          ref={avatarInputRef}
          id='page-avatar-input'
          type='file'
          accept='image/jpeg,image/png,image/webp,image/gif'
          onChange={(event) => void uploadMedia('avatar', event.target.files?.[0] ?? null)}
        />
      </div>

      <label className='l' htmlFor='page-cover-input'>Cover image <small>JPEG, PNG, WebP, or GIF · up to 5 MB</small></label>
      <div className='f'>
        <input
          ref={coverInputRef}
          id='page-cover-input'
          type='file'
          accept='image/jpeg,image/png,image/webp,image/gif'
          onChange={(event) => void uploadMedia('cover', event.target.files?.[0] ?? null)}
        />
      </div>

      <button className='btn' disabled={saving || deleting}><span>{saving ? 'Saving…' : 'Save changes'}</span><span>→</span></button>
      <button
        type='button'
        className='btn'
        style={{ marginTop: 10, background: 'transparent', color: '#e06c75', border: '1px solid #e06c75' }}
        onClick={() => void remove()}
        disabled={saving || deleting}
      >
        <span>{deleting ? 'Deleting…' : 'Delete page'}</span>
      </button>
      <p className='msg' role={message ? 'alert' : 'status'}>{message}</p>
    </form>
  );
}