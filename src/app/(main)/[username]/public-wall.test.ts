import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('public profile wall contract', () => {
  it('uses the protected Facebook-style profile shell and redirects only the owner to /profile', () => {
    const page = read('src/app/(main)/[username]/page.tsx');
    expect(page).toContain("redirect('/profile')");
    expect(page).toContain("data-theme='dark'");
    expect(page).toContain('DashboardNavbar');
    expect(page).toContain('PostCard');
    expect(page).not.toContain('CreatePostForm');
  });

  it('renders real safe posts, photos, and accepted friends instead of demo content', () => {
    const page = read('src/app/(main)/[username]/page.tsx');
    expect(page).toContain('safePostSelect');
    expect(page).toContain('safeProfilePhotoSelect');
    expect(page).toContain("status: 'ACCEPTED'");
    expect(page).toContain('No friends yet');
    expect(page).toContain('<ProfilePhotos');
  });

  it('exposes only relationship-aware friend and message actions to visitors', () => {
    const actions = read('src/components/profile/public-profile-actions.tsx');
    expect(actions).toContain("relationship: RelationshipState");
    expect(actions).toContain('/api/friends/requests');
    expect(actions).toContain("action: 'accept'");
    expect(actions).toContain('requestOpenChat');
    expect(actions).toContain('Message');
    expect(actions).not.toContain('authorId');
  });
});
