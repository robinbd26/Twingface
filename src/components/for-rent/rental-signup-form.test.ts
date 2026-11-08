import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const form = source('src/components/for-rent/rental-signup-form.tsx');
const css = source('src/app/dashboard.css');

describe('For Rent registration form', () => {
  it('posts the one-pass account plus provider form to the rental sign-up endpoint', () => {
    expect(form).toContain("sendForm('/api/mediaworld/rental-signup', 'POST', body)");
    for (const field of [
      'name', 'email', 'phone', 'password', 'confirmPassword', 'division', 'district',
      'presentAddress', 'ownerName', 'location', 'description',
    ]) {
      expect(form).toContain(`body.set('${field}'`);
    }
    // Optional fields are only sent when filled, so the strict schema never sees blanks.
    expect(form).toContain("if (businessName) body.set('businessName'");
    expect(form).toContain("if (fullAddress) body.set('fullAddress'");
    expect(form).toContain("if (logoFile) body.set('logo'");
  });

  it('labels every field and focuses the first invalid one', () => {
    for (const [id, key] of [
      ['mw-rent-name', 'name'],
      ['mw-rent-email', 'email'],
      ['mw-rent-phone', 'phone'],
      ['mw-rent-password', 'password'],
      ['mw-rent-confirm', 'confirmPassword'],
      ['mw-rent-division', 'division'],
      ['mw-rent-district', 'district'],
      ['mw-rent-address', 'presentAddress'],
      ['mw-rent-owner', 'ownerName'],
      ['mw-rent-business', 'businessName'],
      ['mw-rent-location', 'location'],
      ['mw-rent-full-address', 'fullAddress'],
      ['mw-rent-description', 'description'],
    ]) {
      expect(form).toContain(`${key}: '${id}'`);
    }
    expect(form).toContain('const id = FIELD_IDS[key];');
    expect(form).toContain('document.getElementById(id)?.focus()');
    expect(form).toContain('focusField(firstError)');
    expect(form).toContain('focusField(firstField)');
    expect(form).toContain('aria-invalid={Boolean(errors.division)}');
    expect(form).toContain('aria-invalid={Boolean(errors.district)}');
    expect(form).toContain("error={errorText(errors.");
  });

  it('checks the password before the browser sends it', () => {
    expect(form).toContain('if (passwords.password.length < 8');
    expect(form).toContain('if (passwords.password !== passwords.confirmPassword)');
    expect(form).toContain("autoComplete='new-password'");
    expect(form).toContain('const { ok, status, json } = await sendForm(');
  });

  it('shows or hides the password and can fill a generated strong one', () => {
    expect(form).toContain("import { generateStrongPassword } from '@/lib/client/strong-password';");
    expect(form.match(/type=\{showPasswords \? 'text' : 'password'\}/g)?.length).toBe(2);
    expect(form.match(/<PasswordToggle/g)?.length).toBe(2);
    expect(form).toContain('aria-pressed={shown}');
    expect(form).toContain('aria-label={shown ? hideLabel : showLabel}');
    expect(form).toContain("data-testid='mw-rent-suggest-password'");
    expect(form).toContain('const next = generateStrongPassword();');
    expect(form).toContain('setPasswords({ password: next, confirmPassword: next })');
    expect(form).toContain('setShowPasswords(true)');

    for (const key of ['showPassword', 'hidePassword', 'suggestPassword', 'suggestedNote']) {
      expect(form.match(new RegExp(`${key}:`, 'g'))?.length).toBe(2);
    }
  });

  it('sends a signed-in visitor to the real login surface, not a dead control', () => {
    expect(form).toContain("import AILoginModal from '@/components/mediaworld/ai-login-modal';");
    expect(form).toContain('<AILoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />');
    expect(form).toContain("data-testid='mw-rent-signup-login'");
    expect(form).toContain("onClick={() => setLoginOpen(true)}");
    expect(form).toContain("aria-haspopup='dialog'");
    expect(form).toContain("<Link href='/login'>{t.fullLoginPage}</Link>");
    expect(form).toContain("const [loginOpen, setLoginOpen] = useState(false);");
    expect(form).not.toContain("href='#'");

    // The popup really is a dialog, so aria-haspopup='dialog' is not a false claim.
    const modal = source('src/components/mediaworld/ai-login-modal.tsx');
    expect(modal).toContain("role='dialog' aria-modal='true' aria-labelledby='mw-login-modal-title'");
    expect(modal).toContain("id='mw-login-modal-title'");
  });

  it('offers the Media World profile instead of pretending one type covers both', () => {
    expect(form).toContain("href='/mediaworld/register'");
    expect(form).toContain("data-testid='mw-rent-signup-media-world'");
    expect(form).toContain("<Link href='/mediaworld' data-testid='for-rent-back-to-mediaworld'>");
  });

  it('routes the signed-in states to routes that exist', () => {
    expect(form).toContain("if (accountType === 'RENTAL') {");
    expect(form).toContain("href='/for-rent/dashboard'");
    expect(form).toContain("data-testid='mw-rent-signup-listings'");
    expect(form).toContain("href='/mediaworld/onboarding'");
    expect(form).toContain("data-testid='mw-rent-signup-setup'");
    expect(form).toContain('href={`/mediaworld/talent/${encodeURIComponent(username)}`}');
    expect(form).toContain('Ask a Super Admin to change it.');
    expect(form.match(/<Link/g)?.length).toBe(6);
  });

  it('lands a new provider on the rental dashboard with a full document load', () => {
    expect(form).toContain("setMessage({ tone: 'ok', text: t.success })");
    expect(form).toContain("window.location.assign('/for-rent/dashboard')");
    expect(form).not.toContain("window.location.assign('/mediaworld')");
  });

  it('lists the rental taxonomy as read-only context, not as a fake picker', () => {
    expect(form).toContain('taxonomy.rentalCategories.map((category) =>');
    expect(form).toContain("className='mw-onb-chip static'");
    expect(form).toContain('<small>{category.subcategories.length}</small>');
    expect(form).not.toContain('onChange={selectCategory');
  });

  it('labels the form copy in both languages', () => {
    for (const key of [
      'signedOutLead', 'personalTitle', 'serviceTitle', 'submit', 'success',
      'loginTitle', 'loginButton', 'fullLoginPage', 'mediaWorldLink', 'backToMediaWorld',
      'memberRentTitle', 'memberNoProviderCta', 'memberProfileCta', 'memberOtherTitle',
    ]) {
      expect(form.match(new RegExp(`${key}:`, 'g'))?.length).toBeGreaterThanOrEqual(2);
    }
    expect(form).toContain('const bn = language === \'bn\';');
    expect(form).toContain('const t = TEXT[language];');
  });

  it('styles the error line and the login button used by the form', () => {
    expect(css).toContain('.mw-field-error{color:#ff6b6b;font-size:.8rem}');
    expect(css).toContain('.mw-onb-alt-links button{');
    expect(css).toContain('.mw-onb-alt-links button:hover{');
    expect(css).toContain('.mw-onb-alt-links button:focus-visible{outline:2px solid #2d88ff;outline-offset:2px}');
  });
});
