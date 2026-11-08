import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const page = source('src/app/(main)/for-rent/register/page.tsx');

describe('For Rent registration page', () => {
  it('is a sign-up page, not a login wall', () => {
    expect(page).toContain("title: 'For Rent Registration - Twingface'");
    expect(page).not.toContain("redirect('/login')");
    expect(page).toContain("redirect('/super_admin')");
    expect(page).toContain("if (user?.role === 'SUPER_ADMIN')");
  });

  it('reads only the account facts the form needs', () => {
    expect(page).toContain('select: { accountType: true, username: true, rentalProvider: { select: { id: true } } }');
    expect(page).toContain('where: { id: user.id }');
    expect(page).not.toContain('passwordHash');
    expect(page).not.toContain('include:');
  });

  it('keeps the taxonomy read and the account read in one round trip', () => {
    expect(page).toContain('await Promise.all([');
    expect(page).toContain('getTaxonomySnapshot()');
    expect(page).toContain(': Promise.resolve(null),');
  });

  it('hands the form the bilingual heading and the session state', () => {
    expect(page).toContain("bn: 'ফর রেন্ট অ্যাকাউন্ট খুলুন'");
    expect(page).toContain("en: 'Open a For Rent account'");
    expect(page).toContain('authenticated={Boolean(user)}');
    expect(page).toContain('accountType={account?.accountType ?? null}');
    expect(page).toContain('username={account?.username ?? null}');
    expect(page).toContain('hasProvider={Boolean(account?.rentalProvider)}');
    expect(page).toContain('taxonomy={taxonomy}');
    expect(page).toContain('title={TITLE}');
  });

  it('uses the Media World language shell so the toggle works on this page', () => {
    expect(page).toContain('MediaWorldLanguageProvider');
    expect(page).toContain('MediaWorldLanguageToggle');
    expect(page).toContain("className='mw-onb-shell'");
    expect(page).toContain('mw-onb-card mw-onb-card-wide');
  });

  it('is reached from the join popup and the setup wizard cross-registration footer', () => {
    const joinModal = source('src/components/mediaworld/join-modal.tsx');
    const wizard = source('src/components/mediaworld/onboarding/setup-wizard.tsx');

    expect(joinModal).toContain("visitorHref: '/for-rent/register'");
    expect(wizard).toContain("authenticated ? '/mediaworld/onboarding' : '/for-rent/register'");
  });

  it('sends a rental account to its rental dashboard after sign-in', () => {
    const postLogin = source('src/lib/mediaworld/post-login.ts');

    expect(postLogin).toContain("if (user.accountType === 'RENTAL') return '/for-rent/dashboard';");
  });
});
