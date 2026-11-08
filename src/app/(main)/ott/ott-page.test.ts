import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('OTT page contract', () => {
  it('states honestly that there is no streaming catalogue instead of showing invented titles', () => {
    const page = source('src/app/(main)/ott/page.tsx');

    expect(page).toContain("data-testid='coming-soon-ott'");
    expect(page).toContain('OTT streaming is not available yet');
    expect(existsSync(resolve(process.cwd(), 'src/components/ott/ott-platform.tsx'))).toBe(false);
  });

  it('keeps the route behind a session', () => {
    expect(source('src/app/(main)/ott/page.tsx')).toContain("if (!user) redirect('/login')");
  });
});
