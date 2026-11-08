'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SafeMarketplaceListing } from '@/lib/marketplace';
import { MAX_MARKETPLACE_IMAGES } from '@/lib/marketplace';

const categories = ['ELECTRONICS', 'VEHICLES', 'PROPERTY', 'FURNITURE', 'FASHION', 'HOBBIES', 'OTHER'];

export default function MarketplaceForm({ listing }: { listing?: SafeMarketplaceListing }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]); const [previews, setPreviews] = useState<string[]>([]);
  const [retainedImages, setRetainedImages] = useState(() => listing?.images ?? []); const [error, setError] = useState(''); const [pending, setPending] = useState(false);
  useEffect(() => { const urls = files.map((file) => URL.createObjectURL(file)); setPreviews(urls); return () => urls.forEach(URL.revokeObjectURL); }, [files]);
  const totalImages = retainedImages.length + files.length;
  function selectFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []); const available = MAX_MARKETPLACE_IMAGES - totalImages;
    if (selected.length > available) setError('You can add up to 10 photos.');
    setFiles((current) => [...current, ...selected.slice(0, Math.max(available, 0))]); event.currentTarget.value = '';
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); if (!listing && !files.length) { setError('Add at least one photo.'); return; }
    if (listing && !totalImages) { setError('Keep or add at least one photo.'); return; }
    setPending(true);
    try {
      const form = new FormData(event.currentTarget); files.forEach((file) => form.append('images', file));
      if (listing) retainedImages.forEach((image) => form.append('retainedImageIds', image.id));
      const response = await fetch(listing ? `/api/marketplace/${listing.id}` : '/api/marketplace', { method: listing ? 'PATCH' : 'POST', body: form });
      const body = await response.json().catch(() => null);
      if (!response.ok) { setError(body?.error ?? 'Unable to save listing.'); return; }
      router.push(listing ? `/marketplace/${listing.id}` : `/marketplace/${body.listing.id}`); router.refresh();
    } catch { setError('Unable to save listing. Check your connection and try again.'); } finally { setPending(false); }
  }
  return <form className='marketplace-form surface' onSubmit={submit} encType='multipart/form-data'>
    <label>Title<input name='title' required minLength={3} maxLength={120} defaultValue={listing?.title} /></label><label>Price (৳)<input name='price' required type='text' inputMode='decimal' placeholder='1250.00' defaultValue={listing ? (listing.pricePaisa / 100).toFixed(2) : undefined} /></label><label>Category<select name='category' required defaultValue={listing?.category ?? ''}><option value='' disabled>Select category</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Condition<select name='condition' required defaultValue={listing?.condition ?? 'USED'}><option value='NEW'>New</option><option value='USED'>Used</option></select></label><label>Location<input name='location' required minLength={2} maxLength={120} defaultValue={listing?.location} /></label><label>Description<textarea name='description' required minLength={10} maxLength={2000} defaultValue={listing?.description} /></label>
    <label>Photos (1–10)<input accept='image/jpeg,image/png,image/webp,image/gif' data-testid='input-marketplace-images' type='file' multiple onChange={selectFiles} /></label><div className='marketplace-preview-grid'>{retainedImages.map((image) => <div key={image.id}><img src={image.url} alt='' /><button type='button' onClick={() => setRetainedImages((current) => current.filter((item) => item.id !== image.id))}>Remove</button></div>)}{previews.map((preview, index) => <div key={preview}><img src={preview} alt='' /><button type='button' onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div>)}</div>
    {error ? <p className='marketplace-error' role='alert'>{error}</p> : null}<button className='fb-btn fb-btn-primary' disabled={pending}>{pending ? 'Saving…' : listing ? 'Save changes' : 'Publish listing'}</button>
  </form>;
}
