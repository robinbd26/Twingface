import { describe, expect, it } from 'vitest';
import { GENERIC_INVALID_CREDENTIALS, resolveLoginError } from './login-messages';

const LOCALIZED = 'ইমেইল, ফোন, ইউজার আইডি বা পাসওয়ার্ড সঠিক নয়।';

describe('resolveLoginError', () => {
  it('translates the generic failure so the UI never shows raw server English', () => {
    expect(resolveLoginError(GENERIC_INVALID_CREDENTIALS, LOCALIZED)).toBe(LOCALIZED);
  });

  it('falls back to the localized message when the server sends no error', () => {
    expect(resolveLoginError(undefined, LOCALIZED)).toBe(LOCALIZED);
    expect(resolveLoginError(null, LOCALIZED)).toBe(LOCALIZED);
    expect(resolveLoginError('', LOCALIZED)).toBe(LOCALIZED);
    expect(resolveLoginError('   ', LOCALIZED)).toBe(LOCALIZED);
    expect(resolveLoginError(42, LOCALIZED)).toBe(LOCALIZED);
  });

  it('keeps a specific server error so real problems stay visible', () => {
    expect(resolveLoginError('Account suspended.', LOCALIZED)).toBe('Account suspended.');
  });

  it('keeps the generic copy identical for unknown and wrong-password cases', () => {
    expect(GENERIC_INVALID_CREDENTIALS).toBe('Invalid email or password.');
  });
});
