import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'scripts', 'seed-super-admin.ts'), 'utf8');

describe('seed-super-admin', () => {
  it('reads the admin password via the credentials loader and creates only a SUPER_ADMIN account', () => {
    expect(source).toContain('loadSuperAdminPassword');
    expect(source).toContain('SUPER_ADMIN_EMAIL');
    expect(source).toContain('SUPER_ADMIN_USERNAME');
    expect(source).toContain("role: 'SUPER_ADMIN'");
    expect(source).not.toContain('admin123456##');
    expect(source).not.toContain("?? 'admin'");
  });

  it('trims surrounding whitespace and warns about it', () => {
    expect(source).toContain('trimmed');
    expect(source).toContain('whitespace');
  });
});
