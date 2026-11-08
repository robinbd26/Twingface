import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Marketplace browser UI contract', () => {
  it('keeps Marketplace in the existing app shell while providing the reference browse layout', () => {
    const browser = source('src/components/marketplace/marketplace-browser.tsx');

    expect(browser).toContain('marketplace-reference-layout');
    expect(browser).toContain('marketplace-reference-sidebar');
    expect(browser).toContain('marketplace-reference-search');
    expect(browser).toContain('marketplace-reference-category-chips');
    expect(browser).toContain("href='/marketplace/create'");
    expect(browser).toContain('MarketplaceCard');
  });
});
