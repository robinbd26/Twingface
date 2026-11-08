import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file: string) => readFileSync(resolve(process.cwd(), 'src/components/for-rent', file), 'utf8');

const surfaces = [
  'for-rent-browser.tsx',
  'for-rent-detail.tsx',
  'for-rent-dashboard.tsx',
  'for-rent-bookings.tsx',
  'for-rent-listing-form.tsx',
  'for-rent-gate.tsx',
];

describe('For Rent navigation back to Media World', () => {
  it.each(surfaces)('%s links back to the Media World hub', (file) => {
    const text = read(file);

    expect(text).toContain("data-testid='for-rent-back-to-mediaworld'");
    expect(text).toContain("href='/mediaworld'");
  });

  it.each(surfaces)('%s labels the back link in both languages', (file) => {
    const text = read(file);

    expect(text).toContain('মিডিয়া ওয়ার্ল্ড');
    expect(text).toContain('Media World');
  });
});
