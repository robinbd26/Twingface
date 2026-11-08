import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

function pagesUnder(dir: string): string[] {
  const found: string[] = [];
  const walk = (relative: string) => {
    for (const entry of readdirSync(resolve(process.cwd(), relative), { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const path = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (entry.name === 'page.tsx') found.push(path);
    }
  };
  walk(dir);
  return found;
}

describe('Legacy MediaProfile contact routes', () => {
  it('sends anonymous visitors to the login page before reading any profile', () => {
    for (const path of ['src/app/(main)/mediaworld/find-talent/page.tsx', 'src/app/(main)/mediaworld/profile/[userId]/page.tsx']) {
      const page = source(path);
      const guard = page.indexOf("redirect('/login')");
      const query = page.indexOf('prisma.mediaProfile');

      expect(guard, path).toBeGreaterThan(-1);
      expect(query, path).toBeGreaterThan(-1);
      expect(guard, `${path} must gate before querying`).toBeLessThan(query);
    }
  });

  it('never renders a personal contact link from a page that anonymous visitors can reach', () => {
    const offenders = pagesUnder('src/app')
      .map((path) => ({ path, page: source(path) }))
      .filter(({ page }) => page.includes('tel:') || page.includes('mailto:'))
      .filter(({ page }) => !page.includes("redirect('/login')"))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it('keeps the contact block itself intact for members, who are the reason those numbers are collected', () => {
    expect(source('src/app/(main)/mediaworld/find-talent/page.tsx')).toContain('href={`tel:${p.phone}`}');
    const profile = source('src/app/(main)/mediaworld/profile/[userId]/page.tsx');
    expect(profile).toContain('href={`mailto:${profile.email}`}');
    expect(profile).toContain('href={`tel:${profile.phone}`}');
  });
});
