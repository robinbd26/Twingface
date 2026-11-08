import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const language = () =>
  readFileSync(resolve(process.cwd(), 'src/components/mediaworld/mediaworld-language.tsx'), 'utf8');

describe('MediaWorld language provider', () => {
  it('defaults to Bengali and restores the saved language from localStorage', () => {
    const source = language();

    expect(source).toContain("'use client'");
    expect(source).toContain("useState<MediaWorldLanguage>('bn')");
    expect(source).toContain('window.localStorage.getItem(MEDIAWORLD_LANGUAGE_KEY)');
    expect(source).toContain('window.localStorage.setItem(MEDIAWORLD_LANGUAGE_KEY, nextLanguage)');
    expect(source).toContain("export const MEDIAWORLD_LANGUAGE_KEY = 'twingface-mediaworld-language'");
  });

  it('exposes a bilingual toggle that switches between Bengali and English', () => {
    const source = language();

    expect(source).toContain('export function MediaWorldLanguageToggle');
    expect(source).toContain("data-testid='mediaworld-language-bn'");
    expect(source).toContain("data-testid='mediaworld-language-en'");
    expect(source).toContain("aria-pressed={language === 'bn'}");
    expect(source).toContain("aria-pressed={language === 'en'}");
    expect(source).toContain('useMediaWorldLanguage must be used inside MediaWorldLanguageProvider.');
  });
});
