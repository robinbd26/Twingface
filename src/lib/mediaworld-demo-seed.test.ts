import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'scripts', 'seed-mediaworld-users.ts'), 'utf8');

describe('seed-mediaworld-users', () => {
  it('reads the demo password from the environment instead of embedding it', () => {
    expect(source).toContain('MEDIAWORLD_SEED_PASSWORD');
    expect(source).toContain('loadSeedPassword');
    expect(source).toContain('readEnvFileValue');
    expect(source).not.toMatch(/const PASSWORD\s*=/);
    expect(source).not.toMatch(/passwordHash\s*=\s*['"`]/);
  });

  it('never prints the password and never touches the Super Admin account', () => {
    expect(source).toContain('not shown');
    expect(source).not.toContain('console.log(password');
    expect(source).not.toContain("role: 'SUPER_ADMIN'");
    expect(source).not.toContain('super_admin@');
  });

  it('leaves an existing account password alone when re-running the seed', () => {
    expect(source).toContain('update: { name: demo.name, email },');
    expect(source).not.toContain('update: { passwordHash');
  });
});
