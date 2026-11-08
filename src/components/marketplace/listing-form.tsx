'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LISTING_CATEGORIES, LISTING_CONDITIONS, conditionLabel } from '@/lib/listing';

export default function ListingForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(form: FormData) {
    setPending(true);
    setError('');
    const payload = {
      title: String(form.get('title') ?? ''),
      price: Number(form.get('price')),
      description: String(form.get('description') ?? ''),
      category: String(form.get('category') ?? ''),
      condition: String(form.get('condition') ?? ''),
      location: String(form.get('location') ?? ''),
      imageUrl: String(form.get('imageUrl') ?? ''),
    };
    const response = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    setPending(false);
    if (!response.ok) return setError(data?.error ?? 'Unable to create your listing.');
    router.push('/marketplace');
  }

  return (
    <form action={submit} className='fb-card surface group-form'>
      <label>Title<input name='title' required minLength={3} maxLength={120} placeholder='e.g. iPhone 13 Pro Max' /></label>
      <label>Price (৳)<input name='price' required type='number' min={0} max={1000000000} step={1} placeholder='12500' /></label>
      <label>Category
        <select name='category' required defaultValue=''>
          <option value='' disabled>Select a category</option>
          {LISTING_CATEGORIES.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <label>Condition
        <select name='condition' required defaultValue='USED_GOOD'>
          {LISTING_CONDITIONS.map((value) => <option key={value} value={value}>{conditionLabel(value)}</option>)}
        </select>
      </label>
      <label>Description<textarea name='description' maxLength={1000} placeholder='Condition, reason for selling, pickup or delivery…' /></label>
      <label>Location (optional)<input name='location' maxLength={120} placeholder='e.g. Dhanmondi, Dhaka' /></label>
      <label>Image URL (optional)<input name='imageUrl' type='url' placeholder='https://…' /></label>
      {error ? <p className='fb-intro-error' role='alert'>{error}</p> : null}
      <button className='fb-btn fb-btn-primary' disabled={pending}>{pending ? 'Publishing…' : 'Publish listing'}</button>
    </form>
  );
}
