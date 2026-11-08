/**
 * Shared helpers for the Super Admin credential scripts.
 *
 * The Super Admin password is never committed to the repository. It is read
 * from `SUPER_ADMIN_PASSWORD` in the process environment, falling back to the
 * local `.env` file.
 *
 * The value is normalized before use because a password that carries
 * invisible surrounding whitespace cannot be typed reliably. The failure mode
 * is a generic "invalid credentials" message, which is impossible to
 * diagnose from the login screen, so the normalization is reported loudly
 * instead of being applied silently.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import argon2 from 'argon2';

export const SUPER_ADMIN_EMAIL = 'superadmin@gmail.com';
export const SUPER_ADMIN_USERNAME = 'super_admin';

/**
 * The subset of the environment this module reads. A plain record is accepted
 * so the loader can be tested without touching `process.env`.
 */
export type SuperAdminEnv = Record<string, string | undefined>;

export interface SuperAdminPassword {
  /** The password with surrounding whitespace removed. */
  password: string;
  /** Where the raw value was read from. */
  source: 'environment' | 'dotenv-file';
  /** True when the raw value had leading/trailing whitespace that was removed. */
  trimmed: boolean;
}

export interface NormalizedPassword {
  password: string;
  trimmed: boolean;
}

/**
 * Removes leading/trailing whitespace from a raw password value.
 */
export function normalizeSuperAdminPassword(raw: string): NormalizedPassword {
  const password = raw.trim();
  return { password, trimmed: password !== raw };
}

/**
 * Reads a single key from a `.env` file without touching `process.env`.
 *
 * `process.loadEnvFile()` is deliberately not used here: it only writes into
 * `process.env`, which makes it impossible to test in isolation and leaks
 * between script runs. This parser also strips the quotes that
 * `process.loadEnvFile()` preserves inside the value, which is the source of
 * the stray-whitespace bug this module exists to prevent.
 */
export function readEnvFileValue(envFile: string, key: string): string | undefined {
  if (!existsSync(envFile)) return undefined;

  let contents: string;
  try {
    contents = readFileSync(envFile, 'utf8');
  } catch {
    return undefined;
  }

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const name = line.slice(0, separator).trim();
    if (name !== key) continue;

    let value = line.slice(separator + 1).trim();

    // Strip a matching pair of surrounding quotes, keeping the inner value.
    const quoted = value.length >= 2 && (
      (value[0] === '"' && value[value.length - 1] === '"') ||
      (value[0] === "'" && value[value.length - 1] === "'")
    );

    if (quoted) {
      value = value.slice(1, -1);
    } else {
      // An unquoted value ends at an inline `#` comment, matching the
      // behaviour of Node's own dotenv loader. Without this, the seed script
      // and the running app would read different passwords.
      const comment = value.indexOf('#');
      if (comment !== -1) value = value.slice(0, comment).trim();
    }

    return value;
  }

  return undefined;
}

/**
 * Reads the Super Admin password from the environment, falling back to `.env`.
 *
 * @throws When the variable is missing, empty, or whitespace only.
 */
export function loadSuperAdminPassword(
  env: SuperAdminEnv = process.env,
  cwd: string = process.cwd(),
): SuperAdminPassword {
  const fromEnv = env.SUPER_ADMIN_PASSWORD;
  if (fromEnv !== undefined && fromEnv !== '') {
    const { password, trimmed } = normalizeSuperAdminPassword(fromEnv);
    if (!password) {
      throw new Error(
        'SUPER_ADMIN_PASSWORD must not be empty. Set it in your .env file to a strong password.',
      );
    }
    return { password, source: 'environment', trimmed };
  }

  const fromFile = readEnvFileValue(join(cwd, '.env'), 'SUPER_ADMIN_PASSWORD');
  if (fromFile !== undefined && fromFile !== '') {
    const { password, trimmed } = normalizeSuperAdminPassword(fromFile);
    if (!password) {
      throw new Error(
        'SUPER_ADMIN_PASSWORD must not be empty. Set it in your .env file to a strong password.',
      );
    }
    return { password, source: 'dotenv-file', trimmed };
  }

  throw new Error(
    'SUPER_ADMIN_PASSWORD must be set before creating the Super Admin account. Add it to your .env file.',
  );
}

export interface SuperAdminRecord {
  username: string;
  email: string | null;
  role: string;
  passwordHash: string;
}

export type VerificationStatus = 'ok' | 'mismatch' | 'not-seeded' | 'wrong-role';

export interface VerificationResult {
  status: VerificationStatus;
  /** The account as stored in the database, when one exists. */
  account?: { username: string; email: string | null; role: string };
  /** True when the password had surrounding whitespace that was removed. */
  trimmed: boolean;
  /** The normalized password length, useful for spotting a truncated value. */
  passwordLength: number;
  /** Actionable next step for the operator. */
  remedy: string;
}

/**
 * Compares the configured password against the stored account.
 *
 * Kept free of I/O so it can be unit tested and reused.
 */
export async function verifySuperAdminCredentials(
  expectedPassword: string,
  account: SuperAdminRecord | null,
  trimmed = false,
): Promise<VerificationResult> {
  const base = { trimmed, passwordLength: expectedPassword.length };

  if (!account) {
    return {
      ...base,
      status: 'not-seeded',
      remedy: 'Run: npm run db:seed:super-admin',
    };
  }

  const stored = { username: account.username, email: account.email, role: account.role };

  if (account.role !== 'SUPER_ADMIN') {
    return {
      ...base,
      status: 'wrong-role',
      account: stored,
      remedy: 'Run: npm run db:seed:super-admin',
    };
  }

  const matches = await argon2.verify(account.passwordHash, expectedPassword);

  if (!matches) {
    return {
      ...base,
      status: 'mismatch',
      account: stored,
      remedy: 'Run: npm run db:seed:super-admin (this overwrites the stored password)',
    };
  }

  return {
    ...base,
    status: 'ok',
    account: stored,
    remedy: `Sign in at /login with "${account.username}"${account.email ? ` or "${account.email}"` : ''}.`,
  };
}

/**
 * Lists the requirements the Super Admin password does not meet.
 *
 * These match the registration policy in `src/lib/validations.ts` so the
 * seeded account satisfies the same rules as a self-registered user.
 */
export function describePasswordPolicy(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 8) problems.push('be at least 8 characters');
  if (!/[a-z]/.test(password)) problems.push('include a lowercase letter');
  if (!/[A-Z]/.test(password)) problems.push('include an uppercase letter');
  if (!/\d/.test(password)) problems.push('include a number');
  return problems;
}
