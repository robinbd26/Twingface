import type { CSSProperties } from 'react';

export const INPUT_CLASS =
  'w-full rounded-xl border-0 bg-[#1e1f22] px-4 py-3 text-sm text-[#e4e6eb] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#2d88ff]/40';

export const LABEL_STYLE: CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: '#d1d5db',
  marginBottom: 8,
};

export const ERROR_STYLE: CSSProperties = { color: '#ff6b6b', fontSize: '0.8rem' };
export const HINT_STYLE: CSSProperties = { color: '#6b7280', fontSize: 11.5 };

export type FieldErrors = Record<string, string | string[]>;

type Json = Record<string, unknown> | null;

export function errorText(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value.join(' ') : value;
}

/** Server errors are localised in English, so every fallback message carries both languages. */
export function readError(json: Json, fallback: { bn: string; en: string }, bn: boolean): string {
  const message = typeof json?.error === 'string' ? json.error : '';
  return message || (bn ? fallback.bn : fallback.en);
}

export function readFieldErrors(json: Json): FieldErrors {
  const fields = json?.fields;
  if (!fields || typeof fields !== 'object') return {};
  return fields as FieldErrors;
}

export async function sendJson(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<{ ok: boolean; status: number; json: Json }> {
  const response = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }).catch(() => null);
  if (!response) return { ok: false, status: 0, json: null };
  return { ok: response.ok, status: response.status, json: await response.json().catch(() => null) };
}

export async function postJson(
  url: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; json: Json }> {
  return sendJson(url, 'POST', body);
}

export async function sendForm(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH',
  form: FormData,
): Promise<{ ok: boolean; status: number; json: Json }> {
  const response = await fetch(url, { method, body: form }).catch(() => null);
  if (!response) return { ok: false, status: 0, json: null };
  return { ok: response.ok, status: response.status, json: await response.json().catch(() => null) };
}

export const NETWORK_ERROR = {
  bn: 'নেটওয়ার্ক সমস্যা হয়েছে। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
  en: 'Network error. Please check your connection and try again.',
};
