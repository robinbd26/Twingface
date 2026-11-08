import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd());

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

describe('Super admin route naming', () => {
  it('links to the canonical /super_admin page instead of the hyphenated 404', () => {
    const offenders = walk(resolve(root, 'src'))
      .filter((file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('super-admin-routes.test.ts'))
      .filter((file) => /\/super-admin['"]/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(root, file));

    expect(offenders).toEqual([]);
  });
});
