'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { FormAlert } from '@/components/ui/form-field';
import { NETWORK_ERROR, readError, sendJson } from '@/lib/client/forms';

export type AdminJson = Record<string, unknown> | null;

export const SECTION: CSSProperties = {
  border: '1px solid #2d2f34',
  borderRadius: 14,
  background: '#181a1e',
  padding: '18px 20px',
  marginBottom: 18,
};

export const TITLE: CSSProperties = { margin: '0 0 4px', fontSize: '1.15rem', color: '#e4e6eb' };
export const NOTE: CSSProperties = { margin: '0 0 14px', fontSize: '0.83rem', color: '#9ca3af', lineHeight: 1.5 };
export const MUTED: CSSProperties = { fontSize: '0.78rem', color: '#8b8f98' };
export const STRONG_TEXT: CSSProperties = { fontSize: '0.9rem', color: '#e4e6eb', fontWeight: 700 };

const BASE_BUTTON: CSSProperties = {
  border: '1px solid #3a3d42',
  borderRadius: 9,
  background: '#23262b',
  color: '#e4e6eb',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 700,
  padding: '7px 12px',
};

export const BTN: CSSProperties = BASE_BUTTON;
export const BTN_DANGER: CSSProperties = { ...BASE_BUTTON, background: '#3b1d20', borderColor: '#7f1d1d', color: '#fecaca' };
export const BTN_CONFIRM: CSSProperties = { ...BASE_BUTTON, background: '#1e3a2b', borderColor: '#22c55e', color: '#bbf7d0' };
export const BTN_DISABLED: CSSProperties = { ...BASE_BUTTON, opacity: 0.45, cursor: 'not-allowed' };

export const INPUT: CSSProperties = {
  border: '1px solid #3a3d42',
  borderRadius: 9,
  background: '#1e1f22',
  color: '#e4e6eb',
  fontSize: '0.85rem',
  padding: '8px 10px',
  width: '100%',
};

export const ROW: CSSProperties = {
  borderTop: '1px solid #26282c',
  padding: '12px 0',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  alignItems: 'center',
};

export const TAB_BUTTON = (active: boolean): CSSProperties => ({
  border: `1px solid ${active ? '#2d88ff' : '#3a3d42'}`,
  borderRadius: 999,
  background: active ? '#12283f' : '#23262b',
  color: active ? '#bfdbfe' : '#d1d5db',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 700,
  padding: '8px 14px',
});

export function Pill({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'plain'; children: ReactNode }) {
  const colors = {
    ok: { bg: '#123024', border: '#22c55e66', color: '#bbf7d0' },
    warn: { bg: '#332a12', border: '#f59e0b66', color: '#fde68a' },
    bad: { bg: '#3b1d20', border: '#ef444466', color: '#fecaca' },
    plain: { bg: '#23262b', border: '#3a3d42', color: '#d1d5db' },
  }[tone];
  return (
    <span
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.color,
        borderRadius: 999,
        fontSize: '0.72rem',
        fontWeight: 700,
        padding: '3px 9px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/** Second confirmation before anything that changes shared production data. */
export function ConfirmButton({
  label,
  confirmLabel,
  tone = 'default',
  disabled = false,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  const [armed, setArmed] = useState(false);

  if (disabled) {
    return (
      <button type="button" style={BTN_DISABLED} disabled>
        {label}
      </button>
    );
  }

  if (!armed) {
    return (
      <button type="button" style={tone === 'danger' ? BTN_DANGER : BTN} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        style={tone === 'danger' ? BTN_DANGER : BTN_CONFIRM}
        onClick={() => {
          setArmed(false);
          void onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" style={BTN} onClick={() => setArmed(false)}>
        Cancel
      </button>
    </>
  );
}

export function EmptyState({ title, note }: { title: string; note?: string }) {
  return (
    <p style={{ ...NOTE, margin: '14px 0 0', fontStyle: 'italic' }}>
      {title}
      {note ? <em style={{ display: 'block', ...MUTED, fontStyle: 'normal', marginTop: 4 }}>{note}</em> : null}
    </p>
  );
}

export type Banner = { tone: 'ok' | 'error'; text: string } | null;

export type Outcome = { ok: true; json: AdminJson } | { ok: false; message: string };

async function getJson(url: string): Promise<{ ok: boolean; status: number; json: AdminJson }> {
  const response = await fetch(url).catch(() => null);
  if (!response) return { ok: false, status: 0, json: null };
  return { ok: response.ok, status: response.status, json: await response.json().catch(() => null) };
}

function failureMessage(result: { ok: boolean; status: number; json: AdminJson }, fallback: string): string {
  if (result.status === 0) return NETWORK_ERROR.en;
  return readError(result.json, { bn: fallback, en: fallback }, false);
}

export async function load(url: string, fallback: string): Promise<Outcome> {
  const result = await getJson(url);
  if (!result.ok) return { ok: false, message: failureMessage(result, fallback) };
  return { ok: true, json: result.json };
}

export async function mutate(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body: unknown,
  fallback: string,
): Promise<Outcome> {
  const result = await sendJson(url, method, body);
  if (!result.ok) return { ok: false, message: failureMessage(result, fallback) };
  return { ok: true, json: result.json };
}

export function AlertBanner({ banner }: { banner: Banner }) {
  if (!banner) return null;
  return <FormAlert message={banner.text} tone={banner.tone === 'ok' ? 'ok' : 'error'} />;
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' });

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : DATE_FORMAT.format(date);
}
