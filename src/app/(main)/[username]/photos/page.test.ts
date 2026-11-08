import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';

Object.assign(globalThis, { React });

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), findMany: vi.fn(), notFound: vi.fn(() => { throw new Error('not-found'); }) }));

vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: mocks.findUnique }, post: { findMany: mocks.findMany } } }));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));

import PublicPhotosPage from './page';

const profile = {
  id: 'user-a',
  name: 'Robin Mondol',
  username: 'robin',
  bio: null,
  profileImage: null,
  coverImage: null,
  profession: null,
  education: null,
  currentCity: null,
  hometown: null,
  createdAt: new Date('2026-10-14'),
};

const context = (username = 'Robin') => ({ params: Promise.resolve({ username }) });

describe('public all-photos page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(profile);
    mocks.findMany.mockResolvedValue([{ id: 'post-a', imageUrl: 'https://res.cloudinary.com/twingface/image/upload/post-a.jpg', createdAt: new Date('2026-10-14') }]);
  });

  it('returns not found for an absent profile without loading posts', async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(PublicPhotosPage(context('missing'))).rejects.toThrow('not-found');
    expect(mocks.notFound).toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('loads one lookahead photo so the public gallery can paginate safely', async () => {
    await PublicPhotosPage(context());

    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { username: 'robin' } }));
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { authorId: 'user-a', imageUrl: { not: null } },
      take: 25,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }));
  });

  it('renders only safe image gallery data and delegates continuation to a client gallery', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/(main)/[username]/photos/page.tsx'), 'utf8');
    const gallery = readFileSync(resolve(process.cwd(), 'src/app/(main)/[username]/photos/public-photo-gallery.tsx'), 'utf8');

    expect(source).toContain("import PublicPhotoGallery from './public-photo-gallery'");
    expect(source).toContain('<PublicPhotoGallery');
    expect(source).toContain('const nextCursor = hasMore ? pagePhotos.at(-1)?.id ?? null : null');
    expect(gallery).toContain("import Image from 'next/image'");
    expect(gallery).toContain('Load more photos');
    expect(gallery).toContain('/photos?cursor=${encodeURIComponent(nextCursor)}');
    expect(gallery).toContain('const fetchedPhotos = data.photos;');
    expect(source).toContain('safeProfileSelect');
    expect(source).toContain('safeProfilePhotoSelect');
    expect(gallery).toContain('No photos yet');
    expect(source).not.toContain('passwordHash');
    expect(source).not.toContain('imagePublicId');
  });
});
