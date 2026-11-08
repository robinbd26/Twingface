'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PencilIcon } from '@/components/dashboard/icons';

type IntroProfile = {
  bio: string | null;
  profession: string | null;
  education: string | null;
  currentCity: string | null;
  hometown: string | null;
};

export default function ProfileIntro({ profile }: { profile: IntroProfile }) {
  const router = useRouter();
  const [editing, setEditing] = useState<'bio' | 'details' | null>(null);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [details, setDetails] = useState({
    profession: profile.profession ?? '',
    education: profile.education ?? '',
    currentCity: profile.currentCity ?? '',
    hometown: profile.hometown ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!editing) {
      lastFocusedElement.current?.focus();
      return undefined;
    }

    const focusableElements = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []);
    focusableElements()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) setEditing(null);
      if (event.key === 'Tab') {
        const elements = focusableElements();
        if (!elements.length) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editing, saving]);

  function openEditor(kind: 'bio' | 'details') {
    lastFocusedElement.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setError('');
    setEditing(kind);
  }

  function closeEditor() {
    if (!saving) setEditing(null);
  }

  async function submitBio(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/user/bio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      });
      const data = await response.json().catch(() => null) as { error?: string; fields?: Record<string, string[]> } | null;
      if (!response.ok) throw new Error(data?.fields?.bio?.[0] ?? data?.error ?? 'Unable to update your bio. Please try again.');
      setEditing(null);
      setStatus('Bio updated.');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update your bio. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function submitDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/user/details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
      const data = await response.json().catch(() => null) as { error?: string; fields?: Record<string, string[]> } | null;
      if (!response.ok) throw new Error(Object.values(data?.fields ?? {}).flat()[0] ?? data?.error ?? 'Unable to update your details. Please try again.');
      setEditing(null);
      setStatus('Details updated.');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update your details. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const detailRows = [
    profile.profession ? { label: 'Works as', value: profile.profession, icon: 'briefcase' } : null,
    profile.education ? { label: 'Studied at', value: profile.education, icon: 'education' } : null,
    profile.currentCity ? { label: 'Lives in', value: profile.currentCity, icon: 'home' } : null,
    profile.hometown ? { label: 'From', value: profile.hometown, icon: 'pin' } : null,
  ].filter((row): row is { label: string; value: string; icon: string } => row !== null);

  return (
    <section className='fb-card surface fb-intro' aria-label='Intro'>
      <h2 className='fb-card-title'>Intro</h2>
      <p className='fb-bio'>{profile.bio || 'Never give up.'}</p>
      <button type='button' className='fb-edit-bio' data-testid='button-edit-bio' onClick={() => openEditor('bio')}><PencilIcon size={15} /> Edit bio</button>
      {detailRows.length ? (
        <ul className='fb-intro-list'>
          {detailRows.map((row) => (
            <li key={row.icon}>
              <span className='fb-detail-ico' aria-hidden='true'>{row.icon === 'briefcase' ? '💼' : row.icon === 'education' ? '🎓' : row.icon === 'home' ? '⌂' : '⌖'}</span>
              <span>{row.label} <strong>{row.value}</strong></span>
            </li>
          ))}
        </ul>
      ) : null}
      <button type='button' className='fb-edit-bio' data-testid='button-edit-details' onClick={() => openEditor('details')}><PencilIcon size={15} /> Edit details</button>
      <p className='fb-intro-status' aria-live='polite'>{status}</p>

      {editing === 'bio' ? (
        <div className='fb-intro-dialog-backdrop' role='presentation' onMouseDown={closeEditor}>
          <section ref={dialogRef} className='fb-intro-dialog surface' role='dialog' aria-modal='true' aria-labelledby='edit-bio-title' data-testid='dialog-edit-bio' onMouseDown={(event) => event.stopPropagation()}>
            <header><h3 id='edit-bio-title'>Edit bio</h3><button type='button' aria-label='Close edit bio dialog' onClick={closeEditor} disabled={saving}>×</button></header>
            <form onSubmit={submitBio}>
              <label htmlFor='edit-bio-input'>Bio</label>
              <textarea id='edit-bio-input' value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} disabled={saving} autoFocus />
              {error ? <p className='fb-intro-error' role='alert'>{error}</p> : null}
              <div className='fb-intro-dialog-actions'><button type='button' onClick={closeEditor} disabled={saving}>Cancel</button><button type='submit' className='fb-btn-primary' disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div>
            </form>
          </section>
        </div>
      ) : null}

      {editing === 'details' ? (
        <div className='fb-intro-dialog-backdrop' role='presentation' onMouseDown={closeEditor}>
          <section ref={dialogRef} className='fb-intro-dialog surface' role='dialog' aria-modal='true' aria-labelledby='edit-details-title' data-testid='dialog-edit-details' onMouseDown={(event) => event.stopPropagation()}>
            <header><h3 id='edit-details-title'>Edit details</h3><button type='button' aria-label='Close edit details dialog' onClick={closeEditor} disabled={saving}>×</button></header>
            <form onSubmit={submitDetails}>
              <label htmlFor='edit-profession'>Profession</label><input id='edit-profession' value={details.profession} onChange={(event) => setDetails((current) => ({ ...current, profession: event.target.value }))} maxLength={100} disabled={saving} autoFocus />
              <label htmlFor='edit-education'>Education</label><input id='edit-education' value={details.education} onChange={(event) => setDetails((current) => ({ ...current, education: event.target.value }))} maxLength={160} disabled={saving} />
              <label htmlFor='edit-current-city'>Current city</label><input id='edit-current-city' value={details.currentCity} onChange={(event) => setDetails((current) => ({ ...current, currentCity: event.target.value }))} maxLength={120} disabled={saving} />
              <label htmlFor='edit-hometown'>Hometown</label><input id='edit-hometown' value={details.hometown} onChange={(event) => setDetails((current) => ({ ...current, hometown: event.target.value }))} maxLength={120} disabled={saving} />
              {error ? <p className='fb-intro-error' role='alert'>{error}</p> : null}
              <div className='fb-intro-dialog-actions'><button type='button' onClick={closeEditor} disabled={saving}>Cancel</button><button type='submit' className='fb-btn-primary' disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
