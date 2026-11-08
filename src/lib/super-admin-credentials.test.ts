import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import argon2 from 'argon2';
import { describe, expect, it } from 'vitest';
import {
  describePasswordPolicy,
  loadSuperAdminPassword,
  normalizeSuperAdminPassword,
  readEnvFileValue,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_USERNAME,
  verifySuperAdminCredentials,
} from '../../scripts/super-admin-credentials.ts';

describe('normalizeSuperAdminPassword', () => {
  it('removes surrounding whitespace so the password can be typed reliably', () => {
    expect(normalizeSuperAdminPassword('  SuperAdmin@2026  ')).toEqual({
      password: 'SuperAdmin@2026',
      trimmed: true,
    });
  });

  it('removes trailing whitespace only', () => {
    expect(normalizeSuperAdminPassword('SuperAdmin@2026 ')).toEqual({
      password: 'SuperAdmin@2026',
      trimmed: true,
    });
  });

  it('removes leading whitespace only', () => {
    expect(normalizeSuperAdminPassword(' SuperAdmin@2026')).toEqual({
      password: 'SuperAdmin@2026',
      trimmed: true,
    });
  });

  it('reports no trimming for a clean value', () => {
    expect(normalizeSuperAdminPassword('SuperAdmin@2026')).toEqual({
      password: 'SuperAdmin@2026',
      trimmed: false,
    });
  });

  it('keeps whitespace inside the password intact', () => {
    expect(normalizeSuperAdminPassword('Super Admin@2026')).toEqual({
      password: 'Super Admin@2026',
      trimmed: false,
    });
  });

  it('reduces a whitespace-only value to an empty password', () => {
    expect(normalizeSuperAdminPassword('   ')).toEqual({ password: '', trimmed: true });
  });
});


describe('readEnvFileValue', () => {
  const write = (contents: string) => {
    const cwd = mkdtempSync(join(tmpdir(), 'twingface-env-'));
    writeFileSync(join(cwd, '.env'), contents);
    return join(cwd, '.env');
  };

  it('reads a double-quoted value', () => {
    const envFile = write('SUPER_ADMIN_PASSWORD="SuperAdmin@2026"\n');

    expect(readEnvFileValue(envFile, 'SUPER_ADMIN_PASSWORD')).toBe('SuperAdmin@2026');
  });

  it('reads a single-quoted value', () => {
    const envFile = write("SUPER_ADMIN_PASSWORD='SuperAdmin@2026'\n");

    expect(readEnvFileValue(envFile, 'SUPER_ADMIN_PASSWORD')).toBe('SuperAdmin@2026');
  });

  it('reads an unquoted value', () => {
    const envFile = write('SUPER_ADMIN_PASSWORD=SuperAdmin@2026\n');

    expect(readEnvFileValue(envFile, 'SUPER_ADMIN_PASSWORD')).toBe('SuperAdmin@2026');
  });

  it('strips an inline comment from an unquoted value', () => {
    const envFile = write('SUPER_ADMIN_PASSWORD=SuperAdmin@2026 # the admin password\n');

    expect(readEnvFileValue(envFile, 'SUPER_ADMIN_PASSWORD')).toBe('SuperAdmin@2026');
  });

  it('keeps a hash inside a quoted value', () => {
    const envFile = write('SUPER_ADMIN_PASSWORD="Super#Admin@2026"\n');

    expect(readEnvFileValue(envFile, 'SUPER_ADMIN_PASSWORD')).toBe('Super#Admin@2026');
  });

  it('skips commented-out entries', () => {
    const envFile = write('# SUPER_ADMIN_PASSWORD="Commented@2026"\n');

    expect(readEnvFileValue(envFile, 'SUPER_ADMIN_PASSWORD')).toBeUndefined();
  });

  it('returns undefined for a missing key', () => {
    const envFile = write('OTHER=value\n');

    expect(readEnvFileValue(envFile, 'SUPER_ADMIN_PASSWORD')).toBeUndefined();
  });

  it('returns undefined when the file does not exist', () => {
    expect(readEnvFileValue(join(tmpdir(), 'twingface-missing-env', '.env'), 'SUPER_ADMIN_PASSWORD')).toBeUndefined();
  });
});

describe('loadSuperAdminPassword', () => {
  it('prefers the process environment over the .env file', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'twingface-env-'));
    writeFileSync(join(cwd, '.env'), 'SUPER_ADMIN_PASSWORD="FromFile@2026"\n');

    const result = loadSuperAdminPassword({ SUPER_ADMIN_PASSWORD: 'FromEnv@2026' }, cwd);

    expect(result.password).toBe('FromEnv@2026');
    expect(result.source).toBe('environment');
  });

  it('falls back to the .env file when the environment variable is absent', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'twingface-env-'));
    writeFileSync(join(cwd, '.env'), 'SUPER_ADMIN_PASSWORD="FromFile@2026"\n');

    const result = loadSuperAdminPassword({}, cwd);

    expect(result.password).toBe('FromFile@2026');
    expect(result.source).toBe('dotenv-file');
  });

  it('trims whitespace that the .env parser preserves inside quoted values', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'twingface-env-'));
    writeFileSync(join(cwd, '.env'), 'SUPER_ADMIN_PASSWORD="SuperAdmin@2026 "\n');

    const result = loadSuperAdminPassword({}, cwd);

    expect(result.password).toBe('SuperAdmin@2026');
    expect(result.trimmed).toBe(true);
  });

  it('trims whitespace from an environment value', () => {
    const result = loadSuperAdminPassword({ SUPER_ADMIN_PASSWORD: ' SuperAdmin@2026 ' }, '/nonexistent');

    expect(result.password).toBe('SuperAdmin@2026');
    expect(result.trimmed).toBe(true);
    expect(result.source).toBe('environment');
  });

  it('throws a helpful error when the password is missing entirely', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'twingface-env-'));

    expect(() => loadSuperAdminPassword({}, cwd)).toThrow(/SUPER_ADMIN_PASSWORD must be set/);
  });

  it('throws when the password is only whitespace', () => {
    expect(() => loadSuperAdminPassword({ SUPER_ADMIN_PASSWORD: '   ' }, '/nonexistent')).toThrow(
      /must not be empty/,
    );
  });
});


describe('describePasswordPolicy', () => {
  it('accepts a password that satisfies the registration policy', () => {
    expect(describePasswordPolicy('SuperAdmin@2026')).toEqual([]);
  });

  it('reports the missing requirements', () => {
    expect(describePasswordPolicy('short')).toEqual([
      'be at least 8 characters',
      'include an uppercase letter',
      'include a number',
    ]);
  });
});

describe('verifySuperAdminCredentials', () => {
  const account = async (password: string, role = 'SUPER_ADMIN') => ({
    username: SUPER_ADMIN_USERNAME,
    email: SUPER_ADMIN_EMAIL,
    role,
    passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
  });

  it('confirms a matching password', async () => {
    const stored = await account('SuperAdmin@2026');

    const result = await verifySuperAdminCredentials('SuperAdmin@2026', stored);

    expect(result.status).toBe('ok');
    expect(result.account).toEqual({
      username: SUPER_ADMIN_USERNAME,
      email: SUPER_ADMIN_EMAIL,
      role: 'SUPER_ADMIN',
    });
    expect(result.remedy).toContain('/login');
  });

  it('detects a password that does not match the stored hash', async () => {
    const stored = await account('SuperAdmin@2026');

    const result = await verifySuperAdminCredentials('WrongPassword@1', stored);

    expect(result.status).toBe('mismatch');
    expect(result.remedy).toContain('npm run db:seed:super-admin');
  });

  it('detects a missing account', async () => {
    const result = await verifySuperAdminCredentials('SuperAdmin@2026', null);

    expect(result.status).toBe('not-seeded');
    expect(result.remedy).toContain('npm run db:seed:super-admin');
  });

  it('detects an account whose role is not SUPER_ADMIN', async () => {
    const stored = await account('SuperAdmin@2026', 'USER');

    const result = await verifySuperAdminCredentials('SuperAdmin@2026', stored);

    expect(result.status).toBe('wrong-role');
    expect(result.account?.role).toBe('USER');
  });

  it('reports that the password was trimmed', async () => {
    const stored = await account('SuperAdmin@2026');

    const result = await verifySuperAdminCredentials('SuperAdmin@2026', stored, true);

    expect(result.trimmed).toBe(true);
    expect(result.passwordLength).toBe('SuperAdmin@2026'.length);
  });

  it('matches the trimmed password against the seeded account', async () => {
    const stored = await account('SuperAdmin@2026');

    const { password } = normalizeSuperAdminPassword('SuperAdmin@2026 ');
    const result = await verifySuperAdminCredentials(password, stored, true);

    expect(result.status).toBe('ok');
    expect(result.trimmed).toBe(true);
  });

  it('does not match an untrimmed password against the seeded account', async () => {
    const stored = await account('SuperAdmin@2026');

    const result = await verifySuperAdminCredentials('SuperAdmin@2026 ', stored, true);

    expect(result.status).toBe('mismatch');
  });
});
