import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), findUnique: vi.fn(), redirect: vi.fn(() => { throw new Error('redirect:/login'); }) }));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

import ProfilePage from './page';
import EditProfilePage from './edit/page';

describe('protected profile pages', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCurrentUser.mockResolvedValue(null); });

  it.each([['profile', ProfilePage], ['edit profile', EditProfilePage]])('redirects unauthenticated users from %s', async (_name, Page) => {
    await expect(Page()).rejects.toThrow('redirect:/login');
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it('uses the approved dark profile template without weakening authentication', () => {
    const pageSource = readFileSync(resolve(process.cwd(), 'src/app/(main)/profile/page.tsx'), 'utf8');

    expect(pageSource).toContain("data-theme='dark'");
    expect(pageSource).toContain('<DashboardNavbar user={{ id: profile.id, name: profile.name, username: profile.username, profileImage: profile.profileImage }} />');
    expect(pageSource).toContain("<ProfileMediaUploader kind='cover'");
    expect(pageSource).toContain("<ProfileMediaUploader kind='profile'");
  });

  it('keeps cover and avatar media controls anchored to their visual containers', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/app/dashboard.css'), 'utf8');

    expect(css).toContain('.profile-media-uploader.fb-cover-edit{position:absolute');
    expect(css).toContain('.profile-media-uploader.fb-cover-edit{z-index:2}');
    expect(css).toContain('.profile-media-uploader.fb-avatar-cam{position:absolute');
  });

  it('renders an uploaded cover as one cropped image rather than a repeated background', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/app/dashboard.css'), 'utf8');

    expect(css).toContain('.fb-cover{position:relative;height:250px;background-image:linear-gradient');
    expect(css).toContain('background-repeat:no-repeat');
    expect(css).toContain('[data-theme=dark] .fb-cover{background-image:linear-gradient');
  });

  it('loads real recent image posts and delegates the photos card to a safe component', () => {
    const pageSource = readFileSync(resolve(process.cwd(), 'src/app/(main)/profile/page.tsx'), 'utf8');
    const photoComponent = readFileSync(resolve(process.cwd(), 'src/app/(main)/profile/profile-photos.tsx'), 'utf8');

    expect(pageSource).toContain("import { safeProfilePhotoSelect } from '@/lib/profile-photos'");
    expect(pageSource).toContain("where: { authorId: currentUser.id, imageUrl: { not: null } }");
    expect(pageSource).toContain("orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]");
    expect(pageSource).toContain('take: 9');
    expect(pageSource).toContain('<ProfilePhotos photos={photos} username={profile.username} />');
    expect(pageSource).not.toContain("const photos = ['#2a3b52'");
    expect(photoComponent).toContain("href={`/${username}/photos`}");
    expect(photoComponent).toContain('No photos yet');
  });

  it('uses real friendship data and keeps the empty state until a friendship exists', () => {
    const pageSource = readFileSync(resolve(process.cwd(), 'src/app/(main)/profile/page.tsx'), 'utf8');

    expect(pageSource).toContain("import { safeFriendshipSelect } from '@/lib/friendship'");
    expect(pageSource).toContain("status: 'ACCEPTED'");
    expect(pageSource).toContain('friendship.count');
    expect(pageSource).toContain('No friends yet');
    expect(pageSource).toContain('fb-friend-grid');
    expect(pageSource).not.toContain('const friends = [');
    expect(pageSource).not.toContain("const mutual = ['A', 'N', 'S']");
  });

  it('opens the existing post composer on the profile instead of navigating to the dashboard', () => {
    const pageSource = readFileSync(resolve(process.cwd(), 'src/app/(main)/profile/page.tsx'), 'utf8');
    const composerSource = readFileSync(resolve(process.cwd(), 'src/components/posts/create-post-form.tsx'), 'utf8');

    expect(pageSource).toContain("import CreatePostForm from '@/components/posts/create-post-form'");
    expect(pageSource).toContain("<CreatePostForm name={firstName} profileImage={profile.profileImage} variant='profile' />");
    expect(pageSource).not.toContain("href='/dashboard'>What&apos;s on your mind");
    expect(composerSource).toContain("variant?: 'dashboard' | 'profile'");
    expect(composerSource).toContain("variant === 'profile'");
  });

  it('uses separate keyboard-contained bio and details dialogs backed by focused APIs', () => {
    const intro = readFileSync(resolve(process.cwd(), 'src/app/(main)/profile/profile-intro.tsx'), 'utf8');
    const css = readFileSync(resolve(process.cwd(), 'src/app/dashboard.css'), 'utf8');

    expect(intro).toContain("/api/user/bio");
    expect(intro).toContain("/api/user/details");
    expect(intro).toContain("method: 'PUT'");
    expect(intro).toContain("dialog-edit-bio");
    expect(intro).toContain("dialog-edit-details");
    expect(intro).toContain('router.refresh()');
    expect(intro).toContain("aria-live='polite'");
    expect(intro).toContain("event.key === 'Tab'");
    expect(intro).toContain('focusableElements');
    expect(intro).toContain('lastFocusedElement.current?.focus()');
    expect(css).toContain('.fb-intro-dialog');
    expect(css).toContain('.fb-photo-grid');
    expect(css).toContain('.fb-photo-empty');
  });
});
