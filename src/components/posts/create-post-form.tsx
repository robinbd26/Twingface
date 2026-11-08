'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getFeelingActivity } from '@/lib/feeling-activity';
import { MAX_POST_IMAGE_BYTES, POST_IMAGE_MIME_TYPES } from '@/lib/post-media';
import { parseYouTubeUrl } from '@/lib/youtube';
import { GlobeIcon, ImageIcon, CloseIcon, SmileIcon, VideoIcon } from '../dashboard/icons';
import FeelingActivityPicker from './feeling-activity-picker';

type CreatePostFormProps = {
  name: string;
  profileImage?: string | null;
  initial?: string;
  variant?: 'dashboard' | 'profile';
};

function ComposerAvatar({ name, profileImage }: Pick<CreatePostFormProps, 'name' | 'profileImage'>) {
  return <span className='avatar avatar-robin' aria-hidden='true'>{profileImage ? <img className='avatar-photo' src={profileImage} alt='' /> : name.charAt(0).toUpperCase() || 'T'}</span>;
}

export default function CreatePostForm({ name, profileImage = null, initial = '', variant = 'dashboard' }: CreatePostFormProps) {
  const [content, setContent] = useState(initial);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedFeelingActivity, setSelectedFeelingActivity] = useState<string | null>(null);
  const [youtubeUrl, setYouTubeUrl] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const clearSelectedImage = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  }, []);

  const closeComposer = useCallback(() => {
    clearSelectedImage();
    setError('');
    setSelectedFeelingActivity(null);
    setYouTubeUrl('');
    setPickerOpen(false);
    setOpen(false);
  }, [clearSelectedImage]);

  function openComposerForImage() {
    setOpen(true);
    window.setTimeout(() => imageInputRef.current?.click(), 0);
  }

  function openComposerForFeeling() {
    setOpen(true);
    setPickerOpen(true);
  }

  function selectFeelingActivity(key: string) {
    setSelectedFeelingActivity(key);
    setPickerOpen(false);
  }

  function clearFeelingActivity() {
    setSelectedFeelingActivity(null);
  }

  function selectImage(file: File | null) {
    if (!file) return;
    if (!POST_IMAGE_MIME_TYPES.includes(file.type as (typeof POST_IMAGE_MIME_TYPES)[number])) {
      setError('Choose a JPEG, PNG, WebP, or GIF image.');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_POST_IMAGE_BYTES) {
      setError('Image must be 5 MB or smaller.');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }
    clearSelectedImage();
    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setSelectedImage(file);
    setImagePreviewUrl(nextPreviewUrl);
    setError('');
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (pickerOpen) {
        setPickerOpen(false);
        return;
      }
      closeComposer();
    };
    window.addEventListener('keydown', onKey);
    if (!pickerOpen) textareaRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [closeComposer, open, pickerOpen]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  async function submit() {
    const normalizedYouTubeUrl = youtubeUrl.trim();
    if (!content.trim() && !selectedImage && !normalizedYouTubeUrl) {
      setError('Write something, add an image, or share a video before posting.');
      return;
    }
    if (normalizedYouTubeUrl && !parseYouTubeUrl(normalizedYouTubeUrl)) {
      setError('Enter a valid YouTube URL.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const form = new FormData();
      if (content) form.set('content', content);
      if (selectedImage) form.set('image', selectedImage);
      if (selectedFeelingActivity) form.set('feelingActivity', selectedFeelingActivity);
      if (youtubeUrl.trim()) form.set('youtubeUrl', youtubeUrl.trim());
      const response = await fetch('/api/posts', { method: 'POST', body: form });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || 'Unable to publish your post.');
      }
      setContent('');
      closeComposer();
      window.location.reload();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to publish your post.');
    } finally {
      setPending(false);
    }
  }

  const feelingActivity = getFeelingActivity(selectedFeelingActivity);

  return (
    <>
      {variant === 'profile' ? (
        <section className='fb-composer-hint surface' aria-label='Create a post'>
          <ComposerAvatar name={name} profileImage={profileImage} />
          <button type='button' className='fb-composer-prompt' data-testid='button-open-profile-composer' onClick={() => setOpen(true)}>
            What&apos;s on your mind, {name}?
          </button>
        </section>
      ) : (
        <section className='composer surface' aria-label='Create a post'>
          <div className='composer-top'>
            <ComposerAvatar name={name} profileImage={profileImage} />
            <button type='button' className='composer-prompt' data-testid='button-open-composer' onClick={() => setOpen(true)}>
              What&apos;s on your mind, {name}?
            </button>
          </div>
          <div className='composer-separator' />
          <div className='composer-actions'>
            <button type='button' data-testid='button-composer-live'>
              <VideoIcon className='action-live' size={21} /><span>Live video</span>
            </button>
            <button type='button' data-testid='button-composer-photo' onClick={openComposerForImage}>
              <ImageIcon className='action-photo' size={21} /><span>Photo/video</span>
            </button>
            <button type='button' data-testid='button-composer-feeling' onClick={openComposerForFeeling}>
              <SmileIcon className='action-feeling' size={21} /><span>Feeling/activity</span>
            </button>
          </div>
        </section>
      )}

      {open ? (
        <div className='modal-backdrop' role='presentation' onMouseDown={(event) => { if (event.target === event.currentTarget) closeComposer(); }}>
          <div className='compose-modal surface page-enter' role='dialog' aria-modal='true' aria-labelledby='compose-title' data-testid='dialog-compose'>
            <div className='modal-heading'>
              <h2 id='compose-title' className='font-display'>Create post</h2>
              <button type='button' aria-label='Close composer' data-testid='button-close-composer' onClick={closeComposer}>
                <CloseIcon size={19} />
              </button>
            </div>
            <div className='modal-author'>
              <ComposerAvatar name={name} profileImage={profileImage} />
              <span>
                <strong>{name}</strong>
                <small><GlobeIcon size={12} /> Friends</small>
              </span>
            </div>
            <textarea
              ref={textareaRef}
              aria-label='Post content'
              data-testid='input-post-content'
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={500}
              placeholder={`What's on your mind, ${name}?`}
              rows={5}
            />
            {feelingActivity ? (
              <div className='feeling-activity-chip' data-testid='selected-feeling-activity'>
                <span aria-hidden='true'>{feelingActivity.emoji}</span>
                <span>{feelingActivity.label}</span>
                <button type='button' data-testid='button-clear-feeling-activity' aria-label='Remove feeling or activity' onClick={clearFeelingActivity}>
                  <CloseIcon size={14} />
                </button>
              </div>
            ) : null}
            <input
              ref={imageInputRef}
              className='file-input-visually-hidden'
              data-testid='input-post-image'
              type='file'
              accept='image/jpeg,image/png,image/webp,image/gif'
              aria-label='Choose an image for your post'
              onChange={(event) => selectImage(event.target.files?.[0] ?? null)}
            />
            {imagePreviewUrl ? (
              <div className='compose-image-preview'>
                <img src={imagePreviewUrl} alt='Selected post image preview' />
                <button type='button' data-testid='button-remove-post-image' aria-label='Remove selected image' onClick={clearSelectedImage}>
                  <CloseIcon size={16} />
                </button>
              </div>
            ) : null}
            <label className='youtube-url-input' htmlFor='input-post-youtube-url'>
              <span>YouTube link <em>(optional)</em></span>
              <input
                id='input-post-youtube-url'
                data-testid='input-post-youtube-url'
                type='url'
                inputMode='url'
                value={youtubeUrl}
                onChange={(event) => setYouTubeUrl(event.target.value)}
                placeholder='Paste a YouTube video link'
              />
            </label>
            {error ? <p className='compose-error' role='alert' aria-live='polite'>{error}</p> : null}
            <div className='post-audience'>
              <span>Add to your post</span>
              <button type='button' aria-label='Add photo or video' onClick={() => imageInputRef.current?.click()}>
                <ImageIcon size={21} />
              </button>
              <button type='button' aria-label='Add a feeling' onClick={() => setPickerOpen(true)}>
                <SmileIcon size={21} />
              </button>
            </div>
            <button type='button' className='publish-button' data-testid='button-publish-post' disabled={pending || (!content.trim() && !selectedImage && !youtubeUrl.trim())} onClick={submit}>
              {pending ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      ) : null}

      {open && pickerOpen ? (
        <FeelingActivityPicker
          value={selectedFeelingActivity}
          onSelect={selectFeelingActivity}
          onClear={clearFeelingActivity}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </>
  );
}
