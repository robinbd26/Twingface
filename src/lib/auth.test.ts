import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from './auth';

describe('password helpers', () => {
  it('stores an Argon2id hash that verifies only its matching password', async () => {
    const hash = await hashPassword('StrongPass123');
    expect(hash).not.toBe('StrongPass123');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(verifyPassword('StrongPass123', hash)).resolves.toBe(true);
    await expect(verifyPassword('WrongPassword123', hash)).resolves.toBe(false);
  }, 15_000);
});

describe('session token helpers', () => {
  it('creates distinct opaque random tokens', () => {
    expect(createSessionToken()).not.toBe(createSessionToken());
  });

  it('hashes tokens with SHA-256', () => {
    expect(hashSessionToken('known-token')).toBe(createHash('sha256').update('known-token').digest('hex'));
  });

  it('uses secure production cookie settings', () => {
    const production = sessionCookieOptions(new Date('2030-01-01T00:00:00.000Z'), true);
    const development = sessionCookieOptions(new Date('2030-01-01T00:00:00.000Z'), false);
    expect(production).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', secure: true });
    expect(development).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', secure: false });
  });
});
