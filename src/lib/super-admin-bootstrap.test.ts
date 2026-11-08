import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migrationPath = join(root, 'prisma', 'migrations', '20261020000000_add_user_roles', 'migration.sql');
const seedPath = join(root, 'scripts', 'seed-super-admin.ts');
const verifyPath = join(root, 'scripts', 'verify-super-admin.ts');

describe('Super Admin bootstrap', () => {
  it('migrates existing users to a role-backed authorization model', () => {
    expect(existsSync(migrationPath)).toBe(true);
    if (!existsSync(migrationPath)) return;

    const migration = readFileSync(migrationPath, 'utf8');
    expect(migration).toContain("CREATE TYPE \"UserRole\" AS ENUM ('USER', 'SUPER_ADMIN')");
    expect(migration).toContain('ADD COLUMN \"role\" \"UserRole\" NOT NULL DEFAULT \'USER\'');
  });

  it('seeds the requested admin account without committing its password', () => {
    expect(existsSync(seedPath)).toBe(true);
    if (!existsSync(seedPath)) return;

    const seed = readFileSync(seedPath, 'utf8');
    expect(seed).toContain('SUPER_ADMIN_PASSWORD');
    expect(seed).toContain('SUPER_ADMIN_USERNAME');
    expect(seed).toContain("role: 'SUPER_ADMIN'");
    expect(seed).not.toContain("?? 'admin'");
  });

  it('trims surrounding whitespace from the password and warns about it', () => {
    expect(existsSync(seedPath)).toBe(true);
    if (!existsSync(seedPath)) return;

    const seed = readFileSync(seedPath, 'utf8');
    expect(seed).toContain('loadSuperAdminPassword');
    expect(seed).toContain('trimmed');
    expect(seed).toContain('whitespace');
  });

  it('ships a verification script that checks the configured credentials', () => {
    expect(existsSync(verifyPath)).toBe(true);
    if (!existsSync(verifyPath)) return;

    const verify = readFileSync(verifyPath, 'utf8');
    expect(verify).toContain('verifySuperAdminCredentials');
    expect(verify).toContain('SUPER_ADMIN_PASSWORD');
  });
});
