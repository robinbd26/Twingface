import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Media World landing page contract', () => {
  it('renders the Media World platform in the standard app shell', () => {
    const page = source('src/app/(main)/mediaworld/page.tsx');
    const componentPath = 'src/components/mediaworld/mediaworld-platform.tsx';

    expect(page).toContain("import MediaWorldPlatform from '@/components/mediaworld/mediaworld-platform'");
    expect(page).toContain("<main className='mediaworld-page'>");
    expect(page).toContain('<MediaWorldPlatform');
    expect(existsSync(resolve(process.cwd(), componentPath))).toBe(true);

    if (!existsSync(resolve(process.cwd(), componentPath))) return;

    const platform = source(componentPath);
    expect(platform).toContain('mediaworld-sidebar');
    expect(platform).toContain('mediaworld-main-cinematic');
    expect(platform).toContain('mediaworld-hero-background');
    expect(platform).toContain('mediaworld-search-row');
  });

  it('serves the landing without a session so logout can return to it', () => {
    const page = source('src/app/(main)/mediaworld/page.tsx');

    expect(page).not.toContain("if (!user) redirect('/login')");
    expect(page).toContain('{user ? (');
    expect(page).toContain('<DashboardNavbar');
  });

  it('feeds the landing the talent directory so the services section is never blank data', () => {
    const page = source('src/app/(main)/mediaworld/page.tsx');
    const browse = source('src/lib/mediaworld/talent-browse.ts');

    expect(page).toContain("import { browseDirectoryTalents } from '@/lib/mediaworld/talent-browse'");
    expect(page).toContain('browseDirectoryTalents()');
    expect(page).toContain('initialListings={rows}');
    expect(page).toContain('initialTalents={talents}');
    expect(page).toContain('authenticated={!!user}');
    expect(page).not.toContain('mediaWorldJoined');

    // The public payload must stay inside the card fields: no contact columns, no owner-written org text.
    const directorySelect = browse.slice(browse.indexOf('export const talentDirectorySelect'), browse.indexOf('export type TalentDirectoryRow'));
    expect(directorySelect).toContain('professionalIdentities: talentIdentitySelect');
    for (const forbidden of ['phone', 'email', 'presentAddress', 'organization', 'rentalProvider', 'talentSettings', 'coverImage']) {
      expect(directorySelect, `public directory select must not read ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('reads only the account type for the member Profile button, nothing else', () => {
    const page = source('src/app/(main)/mediaworld/page.tsx');

    // The hero Profile button must never point at the 404 a plain account gets, so the
    // landing resolves exactly one field to decide whether this member has a Media World profile.
    expect(page).toContain('user ? prisma.user.findUnique');
    expect(page).toContain('select: { accountType: true }');
    expect(page).toContain('profileCta={profileCta}');
    expect(page).toContain('`/mediaworld/talent/${user.username}`, kind: \'open\'');

    // Every signed-in member gets the button: a Media World account opens the talent profile,
    // an account without one gets the create-profile verb that opens the wizard — never a link that would 404.
    expect(page).toContain(`'/mediaworld/register', kind: 'create'`);
    expect(page).toContain('if (user) {');

    // The landing payload stays inside the listing/talent card fields.
    for (const forbidden of ['phone', 'email', 'presentAddress', 'passwordHash']) {
      expect(page, `landing page must not read ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('hands the sidebar tile the session photo without a second lookup', () => {
    const page = source('src/app/(main)/mediaworld/page.tsx');

    // getCurrentUser already selects profileImage, so the member photo is free: the landing
    // forwards it as-is and gives visitors undefined, which renders the clapperboard.
    expect(page).toContain('memberAvatar={user ? { name: user.name, image: user.profileImage } : undefined}');
    expect(page.match(/prisma\.user\.findUnique/g) ?? []).toHaveLength(1);
  });
});
