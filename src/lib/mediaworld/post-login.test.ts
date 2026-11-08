import { describe, expect, it } from 'vitest';
import { mediaWorldPostLoginPath } from './post-login';

describe('mediaWorldPostLoginPath', () => {
  it.each(['PROFESSIONAL', 'BUSINESS'])('sends a %s account to its own public profile', (accountType) => {
    expect(mediaWorldPostLoginPath({ role: 'USER', username: 'robin-t7gad9', accountType })).toBe('/mediaworld/talent/robin-t7gad9');
  });

  it('sends a rental account to its rental dashboard because it has no talent listing', () => {
    expect(mediaWorldPostLoginPath({ role: 'USER', username: 'rental-344999', accountType: 'RENTAL' })).toBe('/for-rent/dashboard');
    expect(mediaWorldPostLoginPath({ role: 'USER', username: null, accountType: 'RENTAL' })).toBe('/for-rent/dashboard');
  });

  it('sends super admins to their console instead of a profile', () => {
    expect(mediaWorldPostLoginPath({ role: 'SUPER_ADMIN', username: 'superadmin', accountType: 'PROFESSIONAL' })).toBe('/super_admin');
  });

  it('keeps plain accounts on the dashboard because they have no Media World profile', () => {
    expect(mediaWorldPostLoginPath({ role: 'USER', username: 'farah.rahman', accountType: null })).toBe('/dashboard');
  });

  it('falls back to the landing page when the login payload has no user', () => {
    expect(mediaWorldPostLoginPath(null)).toBe('/mediaworld');
    expect(mediaWorldPostLoginPath(undefined)).toBe('/mediaworld');
  });
});
