'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MEDIA_WORLD_CATEGORY_LABELS,
  MEDIA_WORLD_CATEGORIES,
  MEDIAWORLD_DIVISIONS,
  DISTRICTS_BY_DIVISION,
  type MediaWorldCategory,
  type MediaWorldDivision,
} from '@/lib/mediaworld';

type FormData = {
  fullName: string;
  profession: MediaWorldCategory | '';
  bio: string;
  division: MediaWorldDivision | '';
  district: string;
  phone: string;
  email: string;
  portfolio: string;
  experience: string;
};

type Step = 'basic' | 'details' | 'location' | 'review';

const INITIAL: FormData = {
  fullName: '',
  profession: '',
  bio: '',
  division: '',
  district: '',
  phone: '',
  email: '',
  portfolio: '',
  experience: '',
};

const STEPS: Step[] = ['basic', 'details', 'location', 'review'];

export default function MediaWorldTalentProfilePage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverMsg, setServerMsg] = useState('');
  const [profile, setProfile] = useState<{ id: string; status: string } | null>(null);

  const step = STEPS[stepIndex];

  useEffect(() => {
    setErrors({});
    setServerMsg('');
  }, [stepIndex]);

  const districts = (form.division
    ? (DISTRICTS_BY_DIVISION[form.division as MediaWorldDivision] ?? [])
    : []) as string[];

  const isDistrictValid = !form.district || districts.includes(form.district);

  function nextStep() {
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1);
  }

  function prevStep() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};

    if (form.fullName.length < 3 || form.fullName.length > 100)
      next.fullName = 'Full name must be 3-100 characters.';
    if (!MEDIA_WORLD_CATEGORIES.includes(form.profession as MediaWorldCategory))
      next.profession = 'Select a valid profession.';
    if (form.bio.length < 10 || form.bio.length > 500)
      next.bio = 'Bio must be 10-500 characters.';
    if (!MEDIAWORLD_DIVISIONS.includes(form.division as never)) next.division = 'Select a valid division.';
    if (!isDistrictValid) next.district = 'Select a valid district for this division.';

    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setServerMsg('');
    try {
      const res = await fetch('/api/mediaworld/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerMsg(json?.error ?? 'Registration failed. Please try again.');
        if (json?.fields) setErrors(json.fields);
        return;
      }
      setProfile(json.profile);
      setStepIndex(3);
    } catch {
      setServerMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="app-shell page-enter" data-theme="dark">
      <main className="fb-layout">
        <section className="fb-main">
          <div className="fb-card surface" style={{ maxWidth: 640, margin: '0 auto' }}>
            {profile ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <h1>Profile Registered</h1>
                <p>
                  Your Media World profile has been submitted and is <strong>{profile.status}</strong>.</p>
                <p>Super Admin will review it shortly.</p>
                <Link className="fb-btn fb-btn-primary" href="/mediaworld">
                  Browse Media World
                </Link>
              </div>
            ) : (
              <>
                <nav className="progress-bar" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  {STEPS.map((s, i) => (
                    <div
                      key={s}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        background: i <= stepIndex ? '#2d88ff' : '#3a3b3e',
                      }}
                    />
                  ))}
                </nav>
                <h1 style={{ marginBottom: 8 }}>Media World casting profile</h1>
                <p style={{ color: '#9aa0a6', marginBottom: 12 }}>
                  This is the legacy casting profile. It sends one profession from a fixed list to Super Admin for review.
                </p>
                <p style={{ color: '#9aa0a6', marginBottom: 20 }}>
                  For a production-house, agency or rental account use{' '}
                  <Link href="/mediaworld/register">Media World registration</Link> instead.
                </p>
                {serverMsg ? (
                  <div role="alert" style={{ color: '#ff6b6b', marginBottom: 12, fontSize: '0.9rem' }}>
                    {serverMsg}
                  </div>
                ) : null}
                <form onSubmit={handleSubmit}>
                  {step === 'basic' && (
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <label>Full Name</label>
                        <input
                          type="text"
                          value={form.fullName}
                          onChange={(e) => setField('fullName', e.target.value)}
                          className="w-full rounded-xl border-0 bg-[#1e1f22] px-4 py-3 text-sm text-[#e4e6eb] focus:outline-none focus:ring-2 focus:ring-[#2d88ff]/40"
                          placeholder="e.g. Rahim Uddin"
                        />
                        {errors.fullName && <span style={{ color: '#ff6b6b', fontSize: '0.8rem' }}>{errors.fullName}</span>}
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label>Profession</label>
                        <select
                          value={form.profession}
                          onChange={(e) => setField('profession', (e.target.value as MediaWorldCategory) || '')}
                          className="w-full rounded-xl border-0 bg-[#1e1f22] px-4 py-3 text-sm text-[#e4e6eb] focus:outline-none focus:ring-2 focus:ring-[#2d88ff]/40"
                        >
                          <option value="">Select a profession</option>
                          {MEDIA_WORLD_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {MEDIA_WORLD_CATEGORY_LABELS[c]}
                            </option>
                          ))}
                        </select>
                        {errors.profession && <span style={{ color: '#ff6b6b', fontSize: '0.8rem' }}>{errors.profession}</span>}
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label>Bio</label>
                        <textarea
                          value={form.bio}
                          onChange={(e) => setField('bio', e.target.value)}
                          rows={4}
                          className="w-full rounded-xl border-0 bg-[#1e1f22] px-4 py-3 text-sm text-[#e4e6eb] focus:outline-none focus:ring-2 focus:ring-[#2d88ff]/40"
                          placeholder="Tell us about your work, experience, and specialty..."
                        />
                        {errors.bio && <span style={{ color: '#ff6b6b', fontSize: '0.8rem' }}>{errors.bio}</span>}
                      </div>
                    </>
                  )}
                  {step === 'details' && (
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <label>Phone</label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setField('phone', e.target.value)}
                          className="w-full rounded-xl border-0 bg-[#1e1f22] px-4 py-3 text-sm text-[#e4e6eb] focus:outline-none focus:ring-2 focus:ring-[#2d88ff]/40"
                          placeholder="+880 1XXX XXXXXX"
                        />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label>Email</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setField('email', e.target.value)}
                          className="w-full rounded-xl border-0 bg-[#1e1f22] px-4 py-3 text-sm text-[#e4e6eb] focus:outline-none focus:ring-2 focus:ring-[#2d88ff]/40"
                          placeholder="you@example.com"
                        />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label>Portfolio URL</label>
                        <input
                          type="url"
                          value={form.portfolio}
                          onChange={(e) => setField('portfolio', e.target.value)}
                          className="w-full rounded-xl border-0 bg-[#1e1f22] px-4 py-3 text-sm text-[#e4e6eb] focus:outline-none focus:ring-2 focus:ring-[#2d88ff]/40"
                          placeholder="https://portfolio.example.com"
                        />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label>Experience</label>
                        <input
                          type="text"
                          value={form.experience}
                          onChange={(e) => setField('experience', e.target.value)}
                          className="w-full rounded-xl border-0 bg-[#1e1f22] px-4 py-3 text-sm text-[#e4e6eb] focus:outline-none focus:ring-2 focus:ring-[#2d88ff]/40"
                          placeholder="e.g. 5 years in film production"
                        />
                      </div>
                    </>
                  )}
                  {step === 'location' && (
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <label>Division</label>
                        <select
                          value={form.division}
                          onChange={(e) => {
                            setField('division', (e.target.value as MediaWorldDivision) || '');
                            setField('district', '');
                          }}
                          className="w-full rounded-xl border-0 bg-[#1e1f22] px-4 py-3 text-sm text-[#e4e6eb] focus:outline-none focus:ring-2 focus:ring-[#2d88ff]/40"
                        >
                          <option value="">Select a division</option>
                          {MEDIAWORLD_DIVISIONS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                        {errors.division && <span style={{ color: '#ff6b6b', fontSize: '0.8rem' }}>{errors.division}</span>}
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label>District</label>
                        <select
                          value={form.district}
                          onChange={(e) => setField('district', e.target.value)}
                          className="w-full rounded-xl border-0 bg-[#1e1f22] px-4 py-3 text-sm text-[#e4e6eb] focus:outline-none focus:ring-2 focus:ring-[#2d88ff]/40"
                        >
                          <option value="">Select a district</option>
                          {districts.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                        {errors.district && <span style={{ color: '#ff6b6b', fontSize: '0.8rem' }}>{errors.district}</span>}
                      </div>
                    </>
                  )}
                  {step === 'review' && (
                    <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
                      <div><strong>Full Name:</strong> {form.fullName}</div>
                      <div><strong>Profession:</strong> {MEDIA_WORLD_CATEGORY_LABELS[form.profession as MediaWorldCategory]}</div>
                      <div><strong>Bio:</strong> {form.bio}</div>
                      <div><strong>Phone:</strong> {form.phone || '-'}</div>
                      <div><strong>Email:</strong> {form.email || '-'}</div>
                      <div><strong>Division:</strong> {form.division}</div>
                      <div><strong>District:</strong> {form.district}</div>
                      <div><strong>Portfolio:</strong> {form.portfolio || '-'}</div>
                      <div><strong>Experience:</strong> {form.experience || '-'}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                    {stepIndex > 0 && (
                      <button
                        type="button"
                        onClick={prevStep}
                        className="fb-btn fb-btn-ghost"
                        disabled={submitting}
                      >
                        Back
                      </button>
                    )}
                    {stepIndex < STEPS.length - 1 ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="fb-btn fb-btn-primary"
                        disabled={submitting}
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="fb-btn fb-btn-primary"
                        disabled={submitting}
                      >
                        {submitting ? 'Submitting…' : 'Register'}
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
            <p style={{ textAlign: 'center', marginTop: 16, color: '#9aa0a6' }}>
              Already registered? Your profile will be reviewed by Super Admin.{' '}
              <Link href="/mediaworld">Back to Media World</Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
