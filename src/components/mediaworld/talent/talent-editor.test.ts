import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Media World talent profile editor', () => {
  it('is owner-only and loads taxonomy, identities and portfolio on the server', () => {
    const page = source('src/app/(main)/mediaworld/talent/[username]/edit/page.tsx');

    expect(page).toContain('profile.id !== user.id');
    expect(page).toContain('notFound()');
    expect(page).toContain('getTaxonomySnapshot');
    expect(page).toContain('loadOnboardingState');
    expect(page).toContain('TalentProfileEditor');
  });

  it('saves each concern through its dedicated Media World endpoint', () => {
    const editor = source('src/components/mediaworld/talent/talent-profile-editor.tsx');

    expect(editor).toContain('/api/mediaworld/profile/details');
    expect(editor).toContain('/api/mediaworld/profile/talent');
    expect(editor).toContain('ProfileMediaUploader');
    expect(editor).toContain('ProfessionalStep');
    expect(editor).toContain('ShowcaseManager');
    expect(editor).toContain("id='rates'");
  });

  it('enforces upload limits and exposes edit/delete modals in the portfolio manager', () => {
    const manager = source('src/components/mediaworld/talent/showcase-manager.tsx');

    expect(manager).toContain('/api/mediaworld/showcase');
    expect(manager).toContain('MAX_SHOWCASE_PHOTOS');
    expect(manager).toContain('MAX_SHOWCASE_VIDEOS');
    expect(manager).toContain('MAX_SHOWCASE_PHOTO_BYTES');
    expect(manager).toContain("'PATCH'");
    expect(manager).toContain("method: 'DELETE'");
    expect(manager).toContain('role=\'dialog\'');
  });

  it('redacts private contact fields on the public profile before rendering', () => {
    const page = source('src/app/(main)/mediaworld/talent/[username]/page.tsx');
    const profile = source('src/components/mediaworld/talent/talent-profile.tsx');

    expect(page).toContain('prepareTalentProfile');
    expect(page).toContain('hidden={hidden}');
    expect(profile).toContain('withheld={hidden.phone}');
    expect(profile).toContain('withheld={hidden.email}');
    expect(profile).toContain('withheld={hidden.whatsapp}');
    expect(profile).toContain('TalentShowcaseGallery');
    expect(profile).toContain('SendMessageButton');
    expect(profile).toContain('hidden.rates');
  });

  it('shows a prominent About Me card with an owner add/edit link', () => {
    const profile = source('src/components/mediaworld/talent/talent-profile.tsx');
    const editor = source('src/components/mediaworld/talent/talent-profile-editor.tsx');

    expect(profile).toContain('About Me');
    expect(profile).toContain('mw-talent-about-card');
    expect(profile).toContain('mw-talent-about-empty');
    expect(profile).toContain('Add Bio');
    expect(profile).toContain('Edit Bio');
    expect(profile).toContain('#about');
    expect(editor).toContain("id='about'");
  });

  it('labels the About controls, focuses the first error and exposes the anchor', () => {
    const editor = source('src/components/mediaworld/talent/talent-profile-editor.tsx');
    const profile = source('src/components/mediaworld/talent/talent-profile.tsx');
    const css = source('src/app/dashboard.css');

    expect(editor).toMatch(/id='mw-editor-bio'\s+name='bio'/);
    expect(editor).toContain("autoComplete='off'");
    expect(editor).toMatch(/id='mw-editor-division'\s+name='division'/);
    expect(editor).toMatch(/id='mw-editor-district'\s+name='district'/);
    expect(editor).toMatch(/id='mw-editor-present'\s+name='presentAddress'/);
    expect(editor).not.toContain('permanentAddress');
    expect(editor).toContain('DETAIL_FIELD_IDS');
    expect(editor).toContain('document.getElementById(firstId)?.focus()');
    expect(profile).toContain("translate='no'");
    expect(css).toContain('#rates,#about{scroll-margin-top:16px}');
    expect(css).toContain('.mw-talent-profile-card-head a:focus-visible');
    expect(css).toContain('.mw-talent-profile-card-head a:hover');
    expect(css).toContain('.mediaworld-cta-button:focus-visible');
    expect(css).toContain('.mediaworld-cta-button:disabled{');
    expect(css).toMatch(/\.mw-talent-profile-desc\{[^}]*overflow-wrap:anywhere/);
  });
});
