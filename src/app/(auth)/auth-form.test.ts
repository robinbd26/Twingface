import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src', 'app', '(auth)', 'auth-form.tsx'), 'utf8');
const loginForm = readFileSync(join(process.cwd(), 'src', 'app', '(auth)', 'login', 'login-form.tsx'), 'utf8');

describe('AuthForm identity controls', () => {
  it('sends super admins to the canonical /super_admin dashboard', () => {
    expect(source).toContain("? '/super_admin' : '/dashboard'");
    expect(loginForm).toContain("? '/super_admin' : '/dashboard'");
  });

  it('uses one email, phone, or User ID field for login', () => {
    expect(source).toContain("const [identifier, setIdentifier] = useState('');");
    expect(source).toContain("body: JSON.stringify({ identifier, password })");
    expect(source).toContain("idl: 'Email, phone, or User ID'");
  });

  it('shows a generated, read-only User ID and offers a one-click password suggestion', () => {
    expect(source).toContain("const [rUsername, setRUsername] = useState(() => createSuggestedUserId(''));");
    expect(source).toContain("htmlFor='ra-username'");
    expect(source).toContain('username: rUsername');
    expect(source).toContain('readOnly');
    expect(source).toContain('Suggest strong password');
    expect(source).toContain('setRPw(suggestedPassword)');
    expect(source).toContain('setRCpw(suggestedPassword)');
  });

  it('translates the generic login failure instead of showing raw server English', () => {
    expect(source).toContain("import { resolveLoginError } from '@/lib/login-messages';");
    expect(source).toContain("badcred: 'Invalid email, phone, User ID, or password.'");
    expect(source).toContain("badcred: 'ইমেইল, ফোন, ইউজার আইডি বা পাসওয়ার্ড সঠিক নয়।'");
    expect(source).toContain("throw new Error(resolveLoginError(body?.error, t('badcred')))");
  });

  it('times out stalled login requests in both login forms', () => {
    for (const form of [source, loginForm]) {
      expect(form).toContain('controller.abort(), LOGIN_TIMEOUT_MS');
      expect(form).toContain('signal: controller.signal');
      expect(form).toContain("t('loginTimeout')");
    }
  });
});
