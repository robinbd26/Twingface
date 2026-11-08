'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PAGE_CATEGORIES } from '@/lib/constants';

export default function CreatePageForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', handle: '', category: '', bio: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.fields ? (Object.values(data.fields).flat()[0] as string) : data.error);
      setMessage('Page created successfully.');
      router.push('/pages');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create your page.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label className='l' htmlFor='page-name'>Page name</label>
      <div className='f'><input id='page-name' value={form.name} onChange={(e) => update('name', e.target.value)} maxLength={100} required /></div>

      <label className='l' htmlFor='page-handle'>Handle <small>letters, numbers, dots, or hyphens</small></label>
      <div className='f'><input id='page-handle' value={form.handle} onChange={(e) => update('handle', e.target.value)} maxLength={30} required /></div>

      <label className='l' htmlFor='page-category'>Category</label>
      <div className='sel'>
        <select id='page-category' value={form.category} onChange={(e) => update('category', e.target.value)} required>
          <option value=''>Select a category</option>
          {PAGE_CATEGORIES.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <label className='l' htmlFor='page-bio'>Bio <small>optional</small></label>
      <div className='f'><input id='page-bio' value={form.bio} onChange={(e) => update('bio', e.target.value)} maxLength={500} /></div>

      <button className='btn' disabled={loading}><span>{loading ? 'Creating…' : 'Create page'}</span><span>→</span></button>
      <p className='msg' role='status'>{message}</p>
    </form>
  );
}