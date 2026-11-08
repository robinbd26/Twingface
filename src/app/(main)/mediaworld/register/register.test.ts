import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Media World registration entry', () => {
  it('runs the landing CTA through the account-type and taxonomy flow', () => {
    const page = source('src/app/(main)/mediaworld/register/page.tsx');

    expect(page).toContain('OnboardingWizard');
    expect(page).toContain('getTaxonomySnapshot');
    expect(page).toContain('loadOnboardingState');
    expect(page).toContain('MediaWorldLanguageProvider');
  });

  it('offers the four-step signup wizard to visitors without a session', () => {
    const page = source('src/app/(main)/mediaworld/register/page.tsx');
    const wizard = source('src/components/mediaworld/onboarding/setup-wizard.tsx');

    expect(page).toContain('SetupWizard');
    expect(page).not.toContain("redirect('/login')");
    expect(wizard).toContain('/api/mediaworld/signup');
    expect(wizard).toContain('/api/mediaworld/profile/personal');
    expect(wizard).toContain('/api/mediaworld/setup/complete');
  });

  it('uploads the cropped profile photo and redirects to the public profile', () => {
    const page = source('src/app/(main)/mediaworld/register/page.tsx');
    const wizard = source('src/components/mediaworld/onboarding/setup-wizard.tsx');

    expect(page).toContain('initialPhoto');
    expect(page).toContain('initialUsername');
    expect(wizard).toContain('/api/profile/media');
    expect(wizard).toContain('/mediaworld/talent/');
    expect(wizard).toContain('mw-setup-preview');
  });

  it('captures an optional bio and previews it live in the wizard', () => {
    const page = source('src/app/(main)/mediaworld/register/page.tsx');
    const wizard = source('src/components/mediaworld/onboarding/setup-wizard.tsx');

    expect(page).toContain('bio: true');
    expect(page).toContain('bio: account.bio');
    expect(wizard).toContain("id='mw-setup-bio'");
    expect(wizard).toContain("setField('bio'");
    expect(wizard).toContain('mw-preview-bio');
  });

  it('labels every personal field and focuses the first invalid one', () => {
    const wizard = source('src/components/mediaworld/onboarding/setup-wizard.tsx');

    for (const [id, name] of [
      ['mw-setup-name', 'name'],
      ['mw-setup-phone', 'phone'],
      ['mw-setup-email', 'email'],
      ['mw-setup-password', 'password'],
      ['mw-setup-confirm', 'confirmPassword'],
      ['mw-setup-division', 'division'],
      ['mw-setup-district', 'district'],
      ['mw-setup-present', 'presentAddress'],
      ['mw-setup-bio', 'bio'],
    ]) {
      expect(wizard).toMatch(new RegExp(`id='${id}'\\s+name='${name}'`));
    }
    expect(wizard).not.toContain('permanentAddress');
    expect(wizard).toContain("autoComplete='off'");
    expect(wizard).toContain('focusPersonalField(firstError)');
    expect(wizard).toContain('focusPersonalField(firstField)');
  });

  it('makes the crop canvas keyboard operable and sizes the preview images', () => {
    const wizard = source('src/components/mediaworld/onboarding/setup-wizard.tsx');

    expect(wizard).toContain('onKeyDown={canvasKeyDown}');
    expect(wizard).toContain('tabIndex={0}');
    expect(wizard).toContain("aria-describedby='mw-photo-crop-hint'");
    expect(wizard).toContain('cropKeys');
    expect(wizard).toContain("fetchPriority='high'");
    expect(wizard.match(/width=\{\d+\} height=\{\d+\}/g)?.length).toBe(3);
  });

  it('keeps the legacy flat profession enum off the registration page', () => {
    const page = source('src/app/(main)/mediaworld/register/page.tsx');

    expect(page).not.toContain('MEDIA_WORLD_CATEGORIES');
    expect(page).not.toContain('MEDIA_WORLD_CATEGORY_LABELS');
    expect(page).not.toContain('/api/mediaworld/register');
  });

  it('still offers the casting profile that feeds the approval queue', () => {
    const legacy = source('src/app/(main)/mediaworld/talent-profile/page.tsx');
    const page = source('src/app/(main)/mediaworld/register/page.tsx');

    expect(legacy).toContain('MEDIA_WORLD_CATEGORIES');
    expect(legacy).toContain('/api/mediaworld/register');
    expect(legacy).toContain('legacy casting profile');
    expect(page).toContain('/mediaworld/talent-profile');
  });

  it('sends an already-complete account to its profile instead of the setup wizard', () => {
    const page = source('src/app/(main)/mediaworld/register/page.tsx');

    expect(page).toContain("redirect(`/mediaworld/talent/${encodeURIComponent(account.username)}`)");
    expect(page).toContain('setupComplete');
    expect(page).toContain('state.identities.length > 0');
    expect(page).not.toContain('AccountReadyPanel');
  });

  it('still resumes an unfinished professional setup at the wizard', () => {
    const page = source('src/app/(main)/mediaworld/register/page.tsx');

    expect(page).toContain('initialIdentities={state?.identities ?? []}');
    expect(page).toContain('authenticated={Boolean(user)}');
  });

  it('opens registration from the login modal with a full page load', () => {
    const modal = source('src/components/mediaworld/ai-login-modal.tsx');

    expect(modal).toContain("window.location.assign('/mediaworld/register')");
    expect(modal).toContain("data-testid='mw-login-register'");
    expect(modal).not.toContain("href='/register'");
    expect(modal).not.toContain("href='#'");
    expect(modal).not.toContain('next/link');
  });

  it('sends a signed-in member from the login modal to their profile', () => {
    const modal = source('src/components/mediaworld/ai-login-modal.tsx');

    expect(modal).toContain('mediaWorldPostLoginPath(data.user)');
    expect(modal).not.toContain("window.location.href = '/mediaworld'");
  });

  it('leaves the Media World landing calls to action pointing at registration', () => {
    const landing = source('src/components/mediaworld/mediaworld-platform.tsx');

    expect(landing.match(/href='\/mediaworld\/register'/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('asks before the back control clears the typed draft and returns to step one', () => {
    const wizard = source('src/components/mediaworld/onboarding/setup-wizard.tsx');

    expect(wizard).toContain('setRestartAsked(true)');
    expect(wizard).toContain("role='alertdialog'");
    expect(wizard).toContain('aria-labelledby');
    expect(wizard).toContain('onClick={restartFromFirstStep}');
    expect(wizard).toContain('setPersonal(initialPersonal ?? EMPTY_PERSONAL)');
    expect(wizard).toContain("setPasswords({ password: '', confirmPassword: '' })");
    expect(wizard).toContain('setErrors({})');
    expect(wizard).toContain('moveTo(1)');
    expect(wizard).toContain('onClick={() => setRestartAsked(false)}');
    expect(wizard).toContain('disabled={busy || photoBusy}');
  });

  it('restarts from the saved draft without dropping rows already on the account', () => {
    const wizard = source('src/components/mediaworld/onboarding/setup-wizard.tsx');

    expect(wizard).toContain('setPhotoPreview(photoUrl)');
    expect(wizard).not.toContain('setIdentities([])');
    expect(wizard).toContain('const signedIn = authenticated || accountCreated;');
    expect(wizard).toContain('if (!authenticated) setAccountCreated(true);');
    expect(wizard).toMatch(/const \{ ok, status, json \} = signedIn/);
    expect(wizard).toContain("      ? await sendJson('/api/mediaworld/profile/personal', 'PATCH', personal)");
  });

  it('labels the restart control in both languages', () => {
    const wizard = source('src/components/mediaworld/onboarding/setup-wizard.tsx');

    for (const key of ['restartBack', 'restartTitle', 'restartLead', 'restartYes', 'restartNo']) {
      expect(wizard.match(new RegExp(`${key}:`, 'g'))?.length).toBe(2);
    }
  });

  it('shows or hides the password and can fill a generated strong one', () => {
    const wizard = source('src/components/mediaworld/onboarding/setup-wizard.tsx');

    expect(wizard).toContain("import { generateStrongPassword } from '@/lib/client/strong-password';");
    expect(wizard.match(/type=\{showPasswords \? 'text' : 'password'\}/g)?.length).toBe(2);
    expect(wizard.match(/<PasswordToggle/g)?.length).toBe(2);
    expect(wizard).toContain('aria-pressed={shown}');
    expect(wizard).toContain('aria-label={shown ? hideLabel : showLabel}');
    expect(wizard).toContain("data-testid='mw-setup-suggest-password'");
    expect(wizard).toContain('const next = generateStrongPassword();');
    expect(wizard).toContain('setPasswords({ password: next, confirmPassword: next })');
    expect(wizard).toContain('setShowPasswords(true)');
    expect(wizard).toContain('setShowPasswords(false)');
  });

  it('labels the password tools in both languages', () => {
    const wizard = source('src/components/mediaworld/onboarding/setup-wizard.tsx');

    for (const key of ['showPassword', 'hidePassword', 'suggestPassword', 'suggestedNote']) {
      expect(wizard.match(new RegExp(`${key}:`, 'g'))?.length).toBe(2);
    }
  });

  it('keeps the header actions clear of the language toggle', () => {
    const css = source('src/app/dashboard.css');

    expect(css).toContain('.mw-onb-card .mediaworld-language-bar{margin-bottom:16px}');
    expect(css).toContain('.mw-onb-head-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}');
  });

  it('offers the other registration paths and only real ones', () => {
    const wizard = source('src/components/mediaworld/onboarding/setup-wizard.tsx');

    expect(wizard).toContain("data-testid='mw-setup-alt-rental'");
    expect(wizard).toContain("authenticated ? '/mediaworld/onboarding' : '/for-rent/register'");
    expect(wizard).toContain("data-testid='mw-setup-alt-channelhub'");
    expect(wizard).toContain("href='/channelhub'");
    // ChannelHub has no sign-up of its own, so visitors get the note instead of a fake link.
    expect(wizard).toContain('<span className=\'mw-onb-alt-note\'>{t.altChannelHubNote}</span>');
    expect(wizard).not.toContain('/channelhub/register');
  });

  it('labels the alternative registration links in both languages', () => {
    const wizard = source('src/components/mediaworld/onboarding/setup-wizard.tsx');

    for (const key of ['altTitle', 'altRental', 'altRentalVisitor', 'altChannelHub', 'altChannelHubNote']) {
      expect(wizard.match(new RegExp(`${key}:`, 'g'))?.length).toBe(2);
    }
  });
});
