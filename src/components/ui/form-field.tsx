'use client';

import { ERROR_STYLE, HINT_STYLE, LABEL_STYLE, type FieldErrors, errorText } from '@/lib/client/forms';

export function FormAlert({ message, tone }: { message: string; tone: 'ok' | 'error' }) {
  return (
    <div
      role='alert'
      style={{
        background: tone === 'ok' ? '#123024' : '#1f2937',
        border: `1px solid ${tone === 'ok' ? '#22c55e66' : '#4b5563'}`,
        color: '#e5e7eb',
        padding: '12px 16px',
        borderRadius: 10,
        marginBottom: 16,
        fontSize: '0.95rem',
      }}
    >
      {message}
    </div>
  );
}

export function Field({
  id,
  label,
  errors,
  hint,
  children,
}: {
  id: string;
  label: string;
  errors: FieldErrors;
  hint?: string;
  children: React.ReactNode;
}) {
  const error = errorText(errors[id]);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={LABEL_STYLE} htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? <span style={ERROR_STYLE}>{error}</span> : hint ? <span style={HINT_STYLE}>{hint}</span> : null}
    </div>
  );
}
