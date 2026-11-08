'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_POST_IMAGE_BYTES, POST_IMAGE_MIME_TYPES } from '@/lib/post-media';
import { CloseIcon, ImageIcon } from '@/components/dashboard/icons';

export default function PagePostForm({ pageId }: { pageId: string }) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [posting, setPosting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const clearSelectedImage = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  }, []);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  function selectImage(file: File | null) {
    if (!file) return;
    if (!POST_IMAGE_MIME_TYPES.includes(file.type as (typeof POST_IMAGE_MIME_TYPES)[number])) {
      setMessage('Choose a JPEG, PNG, WebP, or GIF image.');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_POST_IMAGE_BYTES) {
      setMessage('Image must be 5 MB or smaller.');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }
    clearSelectedImage();
    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setSelectedImage(file);
    setImagePreviewUrl(nextPreviewUrl);
    setMessage('');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPosting(true);
    setMessage('');
    try {
      let response: Response;
      if (selectedImage) {
        const form = new FormData();
        form.set('content', content);
        form.set('image', selectedImage);
        response = await fetch(`/api/pages/${pageId}/posts`, { method: 'POST', body: form });
      } else {
        response = await fetch(`/api/pages/${pageId}/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.fields ? (Object.values(data.fields).flat()[0] as string) : data.error);
      setContent('');
      clearSelectedImage();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to publish your post.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <form className='page-post-form' onSubmit={submit}>
      <textarea
        className='page-post-textarea'
        value={content}
        onChange={(event) => setContent(event.target.value)}
        maxLength={500}
        rows={3}
        placeholder='Share an update from your page…'
        aria-label='Page post content'
        required
      />
      <input
        ref={imageInputRef}
        className='file-input-visually-hidden'
        data-testid='input-page-post-image'
        type='file'
        accept='image/jpeg,image/png,image/webp,image/gif'
        aria-label='Choose an image for your page post'
        onChange={(event) => selectImage(event.target.files?.[0] ?? null)}
      />
      {imagePreviewUrl ? (
        <div className='compose-image-preview'>
          <img src={imagePreviewUrl} alt='Selected page post image preview' />
          <button type='button' data-testid='button-remove-page-post-image' aria-label='Remove selected image' onClick={clearSelectedImage}>
            <CloseIcon size={16} />
          </button>
        </div>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className='fb-btn fb-btn-primary' disabled={posting || !content.trim()}>{posting ? 'Posting…' : 'Post'}</button>
        <button type='button' className='fb-btn' aria-label='Add a photo' onClick={() => imageInputRef.current?.click()} disabled={posting}><ImageIcon size={16} /> Photo</button>
        <span className='fb-friends-count' role={message ? 'alert' : 'status'}>{message}</span>
      </div>
    </form>
  );
}