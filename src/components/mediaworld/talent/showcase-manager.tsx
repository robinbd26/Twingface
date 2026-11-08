'use client';

import { useEffect, useRef, useState } from 'react';
import { useMediaWorldLanguage } from '@/components/mediaworld/mediaworld-language';
import { FormAlert } from '@/components/ui/form-field';
import {
  MAX_SHOWCASE_PHOTOS,
  MAX_SHOWCASE_PHOTO_BYTES,
  MAX_SHOWCASE_TITLE,
  MAX_SHOWCASE_VIDEOS,
  SHOWCASE_PHOTO_MIME_TYPES,
  showcaseVideoHost,
} from '@/lib/mediaworld/showcase';
import type { ShowcaseItemView } from '@/lib/mediaworld/showcase-data';
import {
  ERROR_STYLE,
  INPUT_CLASS,
  LABEL_STYLE,
  NETWORK_ERROR,
  errorText,
  readError,
  readFieldErrors,
  sendForm,
  sendJson,
} from '@/lib/client/forms';

const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

const TEXT = {
  en: {
    title: 'Portfolio manager',
    lead: `Add up to ${MAX_SHOWCASE_PHOTOS} photos and ${MAX_SHOWCASE_VIDEOS} video or showreel links. Visitors see these on your public profile.`,
    photos: 'Photos',
    videos: 'Videos',
    videosLead: 'YouTube, Vimeo, Cloudinary or any public video page — YouTube and Vimeo play inline.',
    emptyPhotos: 'No portfolio photos yet.',
    emptyVideos: 'No video links yet.',
    uploadPhoto: 'Upload photo',
    uploading: 'Uploading…',
    photoLimit: `All ${MAX_SHOWCASE_PHOTOS} photo slots are used. Delete one to upload another.`,
    videoLimit: `All ${MAX_SHOWCASE_VIDEOS} video slots are used. Delete one to add another.`,
    videoUrl: 'Video link',
    videoTitle: 'Caption (optional)',
    addVideo: 'Add video',
    adding: 'Adding…',
    edit: 'Edit',
    delete: 'Delete',
    photoCaption: 'Caption (optional)',
    videoUrlEdit: 'Video link',
    save: 'Save changes',
    saving: 'Saving…',
    cancel: 'Cancel',
    close: 'Close',
    editPhotoTitle: 'Edit photo',
    editVideoTitle: 'Edit video',
    deleteTitle: 'Delete this item?',
    deleteBody: 'This permanently removes it from your portfolio. This cannot be undone.',
    confirmDelete: 'Yes, delete',
    deleting: 'Deleting…',
    photoSaved: 'Photo added to your portfolio.',
    videoSaved: 'Video added to your portfolio.',
    updated: 'Portfolio item updated.',
    deleted: 'Portfolio item deleted.',
    typeError: 'Choose a JPEG, PNG, WebP, or GIF image.',
    sizeError: 'Image must be 5 MB or smaller.',
    uploadError: 'Unable to upload that photo.',
    videoError: 'Unable to add that video.',
    updateError: 'Unable to update that item.',
    deleteError: 'Unable to delete that item.',
    urlRequired: 'Paste a video link.',
    urlInvalid: 'Enter a full http(s) link.',
    captionError: `Keep the caption under ${MAX_SHOWCASE_TITLE} characters.`,
    videoKind: 'Video link',
    open: 'Open link',
    photoAlt: 'Portfolio photo',
    count: (used: number, max: number) => `${used} / ${max}`,
  },
  bn: {
    title: 'পোর্টফোলিও ম্যানেজার',
    lead: `সর্বোচ্চ ${MAX_SHOWCASE_PHOTOS}টি ছবি ও ${MAX_SHOWCASE_VIDEOS}টি ভিডিও বা শোরিল লিঙ্ক যোগ করুন। ভিজিটররা এগুলো আপনার পাবলিক প্রোফাইলে দেখবে।`,
    photos: 'ছবি',
    videos: 'ভিডিও',
    videosLead: 'YouTube, Vimeo, Cloudinary বা যেকোনো পাবলিক ভিডিও পেজ — YouTube ও Vimeo সরাসরি চলে।',
    emptyPhotos: 'এখনো কোনো পোর্টফোলিও ছবি নেই।',
    emptyVideos: 'এখনো কোনো ভিডিও লিঙ্ক নেই।',
    uploadPhoto: 'ছবি আপলোড করুন',
    uploading: 'আপলোড হচ্ছে…',
    photoLimit: `সব ${MAX_SHOWCASE_PHOTOS}টি ছবির স্লট ভরা। নতুন আপলোড করতে একটি মুছুন।`,
    videoLimit: `সব ${MAX_SHOWCASE_VIDEOS}টি ভিডিওর স্লট ভরা। নতুন যোগ করতে একটি মুছুন।`,
    videoUrl: 'ভিডিও লিঙ্ক',
    videoTitle: 'ক্যাপশন (ঐচ্ছিক)',
    addVideo: 'ভিডিও যোগ করুন',
    adding: 'যোগ হচ্ছে…',
    edit: 'সম্পাদনা',
    delete: 'মুছুন',
    photoCaption: 'ক্যাপশন (ঐচ্ছিক)',
    videoUrlEdit: 'ভিডিও লিঙ্ক',
    save: 'পরিবর্তন সংরক্ষণ',
    saving: 'সংরক্ষণ হচ্ছে…',
    cancel: 'বাতিল',
    close: 'বন্ধ করুন',
    editPhotoTitle: 'ছবি সম্পাদনা',
    editVideoTitle: 'ভিডিও সম্পাদনা',
    deleteTitle: 'এই আইটেমটি মুছবেন?',
    deleteBody: 'এটি আপনার পোর্টফোলিও থেকে স্থায়ীভাবে মুছে যাবে। পরে ফেরানো যাবে না।',
    confirmDelete: 'হ্যাঁ, মুছুন',
    deleting: 'মুছে ফেলা হচ্ছে…',
    photoSaved: 'ছবি আপনার পোর্টফোলিওতে যোগ হয়েছে।',
    videoSaved: 'ভিডিও আপনার পোর্টফোলিওতে যোগ হয়েছে।',
    updated: 'পোর্টফোলিও আইটেম আপডেট হয়েছে।',
    deleted: 'পোর্টফোলিও আইটেম মুছে ফেলা হয়েছে।',
    typeError: 'JPEG, PNG, WebP বা GIF ছবি বেছে নিন।',
    sizeError: 'ছবির আকার ৫ MB বা কম হতে হবে।',
    uploadError: 'ছবি আপলোড করা যায়নি।',
    videoError: 'ভিডিও যোগ করা যায়নি।',
    updateError: 'আইটেম আপডেট করা যায়নি।',
    deleteError: 'আইটেম মোছা যায়নি।',
    urlRequired: 'ভিডিও লিঙ্ক দিন।',
    urlInvalid: 'সম্পূর্ণ http(s) লিঙ্ক দিন।',
    captionError: `ক্যাপশন ${MAX_SHOWCASE_TITLE} অক্ষরের মধ্যে রাখুন।`,
    videoKind: 'ভিডিও লিঙ্ক',
    open: 'লিঙ্ক খুলুন',
    photoAlt: 'পোর্টফোলিও ছবি',
    count: (used: number, max: number) => `${used} / ${max}`,
  },
} as const;

function validHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password;
  } catch {
    return false;
  }
}

function Modal({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='mw-modal' role='dialog' aria-modal='true' aria-label={label}>
      <div className='mw-modal-card'>{children}</div>
    </div>
  );
}

export default function ShowcaseManager({ initialItems }: { initialItems: ShowcaseItemView[] }) {
  const { language } = useMediaWorldLanguage();
  const t = TEXT[language];

  const [items, setItems] = useState<ShowcaseItemView[]>(initialItems);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [videoDraft, setVideoDraft] = useState({ url: '', title: '' });
  const [videoErrors, setVideoErrors] = useState<Record<string, string>>({});
  const [videoBusy, setVideoBusy] = useState(false);
  const [editing, setEditing] = useState<ShowcaseItemView | null>(null);
  const [editDraft, setEditDraft] = useState({ title: '', url: '' });
  const [editError, setEditError] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [deleting, setDeleting] = useState<ShowcaseItemView | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photos = items.filter((item) => item.kind === 'PHOTO');
  const videos = items.filter((item) => item.kind === 'VIDEO');
  const photosFull = photos.length >= MAX_SHOWCASE_PHOTOS;
  const videosFull = videos.length >= MAX_SHOWCASE_VIDEOS;

  useEffect(() => {
    if (!editing && !deleting) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (!editBusy && !deleteBusy) {
        setEditing(null);
        setDeleting(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editing, deleting, editBusy, deleteBusy]);

  function resetPhotoInput() {
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function uploadPhoto(file: File | null) {
    if (!file || photoBusy) return;
    setMessage(null);
    setPhotoError('');
    if (!SHOWCASE_PHOTO_MIME_TYPES.includes(file.type as (typeof SHOWCASE_PHOTO_MIME_TYPES)[number])) {
      setPhotoError(t.typeError);
      resetPhotoInput();
      return;
    }
    if (file.size > MAX_SHOWCASE_PHOTO_BYTES) {
      setPhotoError(t.sizeError);
      resetPhotoInput();
      return;
    }

    setPhotoBusy(true);
    const form = new FormData();
    form.set('image', file);
    const { ok, status, json } = await sendForm('/api/mediaworld/showcase', 'POST', form);
    setPhotoBusy(false);
    resetPhotoInput();

    const item = (json as { item?: ShowcaseItemView } | null)?.item;
    if (!ok || !item) {
      setPhotoError(status === 0 ? (language === 'bn' ? NETWORK_ERROR.bn : NETWORK_ERROR.en) : readError(json, { bn: t.uploadError, en: t.uploadError }, language === 'bn'));
      return;
    }
    setItems((current) => [...current, item]);
    setMessage({ tone: 'ok', text: t.photoSaved });
  }

  async function addVideo() {
    if (videoBusy || videosFull) return;
    const url = videoDraft.url.trim();
    const title = videoDraft.title.trim();
    const next: Record<string, string> = {};
    if (!url) next.url = t.urlRequired;
    else if (!validHttpUrl(url)) next.url = t.urlInvalid;
    if (title.length > MAX_SHOWCASE_TITLE) next.title = t.captionError;
    setVideoErrors(next);
    if (Object.keys(next).length) return;

    setVideoBusy(true);
    setMessage(null);
    const { ok, status, json } = await sendJson('/api/mediaworld/showcase', 'POST', { url, title });
    setVideoBusy(false);

    if (!ok) {
      const fields = readFieldErrors(json);
      setVideoErrors(Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, errorText(value)])));
      if (!Object.keys(fields).length) {
        setMessage({
          tone: 'error',
          text: status === 0 ? (language === 'bn' ? NETWORK_ERROR.bn : NETWORK_ERROR.en) : readError(json, { bn: t.videoError, en: t.videoError }, language === 'bn'),
        });
      }
      return;
    }

    const item = (json as { item?: ShowcaseItemView } | null)?.item;
    if (!item) {
      setMessage({ tone: 'error', text: t.videoError });
      return;
    }
    setItems((current) => [...current, item]);
    setVideoDraft({ url: '', title: '' });
    setVideoErrors({});
    setMessage({ tone: 'ok', text: t.videoSaved });
  }

  function openEdit(item: ShowcaseItemView) {
    setEditing(item);
    setEditDraft({ title: item.title ?? '', url: item.url });
    setEditError('');
  }

  async function saveEdit() {
    if (!editing || editBusy) return;
    const title = editDraft.title.trim();
    if (title.length > MAX_SHOWCASE_TITLE) {
      setEditError(t.captionError);
      return;
    }
    const body: { title: string; url?: string } = { title };
    if (editing.kind === 'VIDEO') {
      const url = editDraft.url.trim();
      if (!url) {
        setEditError(t.urlRequired);
        return;
      }
      if (!validHttpUrl(url)) {
        setEditError(t.urlInvalid);
        return;
      }
      body.url = url;
    }

    setEditBusy(true);
    setEditError('');
    const { ok, status, json } = await sendJson(`/api/mediaworld/showcase/${editing.id}`, 'PATCH', body);
    setEditBusy(false);

    const item = (json as { item?: ShowcaseItemView } | null)?.item;
    if (!ok || !item) {
      setEditError(status === 0 ? (language === 'bn' ? NETWORK_ERROR.bn : NETWORK_ERROR.en) : readError(json, { bn: t.updateError, en: t.updateError }, language === 'bn'));
      return;
    }
    setItems((current) => current.map((entry) => (entry.id === item.id ? item : entry)));
    setEditing(null);
    setMessage({ tone: 'ok', text: t.updated });
  }

  async function confirmDelete() {
    if (!deleting || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError('');
    const response = await fetch(`/api/mediaworld/showcase/${deleting.id}`, { method: 'DELETE' }).catch(() => null);
    setDeleteBusy(false);

    if (!response) {
      setDeleteError(language === 'bn' ? NETWORK_ERROR.bn : NETWORK_ERROR.en);
      return;
    }
    if (!response.ok) {
      const json = await response.json().catch(() => null);
      setDeleteError(readError(json, { bn: t.deleteError, en: t.deleteError }, language === 'bn'));
      return;
    }
    const id = deleting.id;
    setItems((current) => current.filter((entry) => entry.id !== id));
    setDeleting(null);
    setMessage({ tone: 'ok', text: t.deleted });
  }

  return (
    <section className='mw-manage' id='portfolio'>
      <div className='mw-manage-head'>
        <div>
          <h2>{t.title}</h2>
          <p className='mw-talent-muted'>{t.lead}</p>
        </div>
      </div>

      {message ? <FormAlert message={message.text} tone={message.tone} /> : null}

      <div className='mw-manage-panel'>
        <div className='mw-manage-panel-head'>
          <h3>{t.photos}</h3>
          <span className='mw-manage-count'>{t.count(photos.length, MAX_SHOWCASE_PHOTOS)}</span>
        </div>

        <div className='mw-manage-grid'>
          {photos.map((photo) => (
            <figure key={photo.id} className='mw-manage-item'>
              <img src={photo.url} alt={photo.title || t.photoAlt} loading='lazy' />
              <figcaption>{photo.title || '—'}</figcaption>
              <div className='mw-manage-item-actions'>
                <button type='button' onClick={() => openEdit(photo)}>{t.edit}</button>
                <button type='button' className='danger' onClick={() => { setDeleting(photo); setDeleteError(''); }}>{t.delete}</button>
              </div>
            </figure>
          ))}

          {photosFull ? null : (
            <div className='mw-manage-add'>
              <input
                ref={fileInputRef}
                className='file-input-visually-hidden'
                type='file'
                accept={PHOTO_ACCEPT}
                aria-label={t.uploadPhoto}
                onChange={(event) => { void uploadPhoto(event.target.files?.[0] ?? null); }}
              />
              <button type='button' onClick={() => fileInputRef.current?.click()} disabled={photoBusy}>
                <span aria-hidden='true'>+</span>
                {photoBusy ? t.uploading : t.uploadPhoto}
              </button>
            </div>
          )}
        </div>

        {photos.length ? null : <p className='mw-talent-muted'>{t.emptyPhotos}</p>}
        {photosFull ? <p className='mw-talent-muted'>{t.photoLimit}</p> : null}
        {photoError ? <p style={ERROR_STYLE} role='alert'>{photoError}</p> : null}
      </div>

      <div className='mw-manage-panel'>
        <div className='mw-manage-panel-head'>
          <h3>{t.videos}</h3>
          <span className='mw-manage-count'>{t.count(videos.length, MAX_SHOWCASE_VIDEOS)}</span>
        </div>
        <p className='mw-talent-muted'>{t.videosLead}</p>

        {videos.length ? (
          <ul className='mw-manage-videos'>
            {videos.map((video) => (
              <li key={video.id}>
                <span className='mw-manage-video-kind' aria-hidden='true'>▶</span>
                <span className='mw-manage-video-copy'>
                  <strong>{video.title || showcaseVideoHost(video.url)}</strong>
                  <em>{showcaseVideoHost(video.url)}</em>
                </span>
                <a href={video.url} target='_blank' rel='noopener noreferrer nofollow' aria-label={t.open}>↗</a>
                <span className='mw-manage-item-actions'>
                  <button type='button' onClick={() => openEdit(video)}>{t.edit}</button>
                  <button type='button' className='danger' onClick={() => { setDeleting(video); setDeleteError(''); }}>{t.delete}</button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className='mw-talent-muted'>{t.emptyVideos}</p>
        )}

        {videosFull ? (
          <p className='mw-talent-muted'>{t.videoLimit}</p>
        ) : (
          <div className='mw-manage-video-form'>
            <div className='mw-manage-field'>
              <label style={LABEL_STYLE} htmlFor='mw-showcase-video-url'>{t.videoUrl}</label>
              <input
                id='mw-showcase-video-url'
                className={INPUT_CLASS}
                value={videoDraft.url}
                placeholder='https://www.youtube.com/watch?v=…'
                onChange={(event) => {
                  setVideoDraft((current) => ({ ...current, url: event.target.value }));
                  setVideoErrors((current) => ({ ...current, url: '' }));
                }}
              />
              {videoErrors.url ? <span style={ERROR_STYLE}>{videoErrors.url}</span> : null}
            </div>
            <div className='mw-manage-field'>
              <label style={LABEL_STYLE} htmlFor='mw-showcase-video-title'>{t.videoTitle}</label>
              <input
                id='mw-showcase-video-title'
                className={INPUT_CLASS}
                value={videoDraft.title}
                maxLength={MAX_SHOWCASE_TITLE}
                onChange={(event) => {
                  setVideoDraft((current) => ({ ...current, title: event.target.value }));
                  setVideoErrors((current) => ({ ...current, title: '' }));
                }}
              />
              {videoErrors.title ? <span style={ERROR_STYLE}>{videoErrors.title}</span> : null}
            </div>
            <button type='button' className='mediaworld-cta-button' onClick={addVideo} disabled={videoBusy}>
              {videoBusy ? t.adding : t.addVideo}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <Modal label={editing.kind === 'PHOTO' ? t.editPhotoTitle : t.editVideoTitle}>
          <h3>{editing.kind === 'PHOTO' ? t.editPhotoTitle : t.editVideoTitle}</h3>
          {editing.kind === 'VIDEO' ? (
            <div className='mw-manage-field'>
              <label style={LABEL_STYLE} htmlFor='mw-showcase-edit-url'>{t.videoUrlEdit}</label>
              <input
                id='mw-showcase-edit-url'
                className={INPUT_CLASS}
                value={editDraft.url}
                onChange={(event) => setEditDraft((current) => ({ ...current, url: event.target.value }))}
              />
            </div>
          ) : (
            <img className='mw-modal-photo' src={editing.url} alt={editing.title || t.photoAlt} />
          )}
          <div className='mw-manage-field'>
            <label style={LABEL_STYLE} htmlFor='mw-showcase-edit-title'>{t.photoCaption}</label>
            <input
              id='mw-showcase-edit-title'
              className={INPUT_CLASS}
              value={editDraft.title}
              maxLength={MAX_SHOWCASE_TITLE}
              onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          {editError ? <p style={ERROR_STYLE} role='alert'>{editError}</p> : null}
          <div className='mw-modal-actions'>
            <button type='button' className='mw-setup-back' onClick={() => setEditing(null)} disabled={editBusy}>{t.cancel}</button>
            <button type='button' className='mediaworld-cta-button' onClick={saveEdit} disabled={editBusy}>
              {editBusy ? t.saving : t.save}
            </button>
          </div>
        </Modal>
      ) : null}

      {deleting ? (
        <Modal label={t.deleteTitle}>
          <h3>{t.deleteTitle}</h3>
          <p className='mw-talent-muted'>{t.deleteBody}</p>
          {deleteError ? <p style={ERROR_STYLE} role='alert'>{deleteError}</p> : null}
          <div className='mw-modal-actions'>
            <button type='button' className='mw-setup-back' onClick={() => setDeleting(null)} disabled={deleteBusy}>{t.cancel}</button>
            <button type='button' className='mediaworld-cta-button mw-danger-button' onClick={confirmDelete} disabled={deleteBusy}>
              {deleteBusy ? t.deleting : t.confirmDelete}
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
