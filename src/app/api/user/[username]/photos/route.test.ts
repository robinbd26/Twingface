import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), findMany: vi.fn() }));

vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: mocks.findUnique }, post: { findMany: mocks.findMany } } }));

import { GET as getPhotos } from './route';
import { GET as getRecentPhotos } from './recent/route';

const owner = { id: 'user-a' };
const photo = (id: string) => ({ id, imageUrl: `https://res.cloudinary.com/twingface/image/upload/${id}.jpg`, createdAt: new Date(`2026-10-${id === 'photo-a' ? '14' : '13'}`) });

const context = (username = 'Robin') => ({ params: Promise.resolve({ username }) });

describe('public user photo APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(owner);
    mocks.findMany.mockResolvedValue([photo('photo-a'), photo('photo-b')]);
  });

  it('returns 404 without querying posts when the requested owner is missing', async () => {
    mocks.findUnique.mockResolvedValue(null);

    expect((await getRecentPhotos(new Request('http://localhost/api/user/missing/photos/recent'), context('missing'))).status).toBe(404);
    expect((await getPhotos(new Request('http://localhost/api/user/missing/photos'), context('missing'))).status).toBe(404);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('returns at most nine safe recent images in deterministic reverse chronology', async () => {
    const response = await getRecentPhotos(new Request('http://localhost/api/user/Robin/photos/recent'), context());

    expect(response.status).toBe(200);
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { username: 'robin' }, select: { id: true } });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { authorId: 'user-a', imageUrl: { not: null } },
      take: 9,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }));
    const body = await response.json();
    expect(body.photos).toHaveLength(2);
    expect(JSON.stringify(body)).not.toContain('imagePublicId');
    expect(JSON.stringify(body)).not.toContain('author');
    expect(JSON.stringify(body)).not.toContain('content');
  });

  it('uses a bounded cursor page and returns a next cursor only when more rows exist', async () => {
    await getPhotos(new Request('http://localhost/api/user/Robin/photos?cursor=photo-z&limit=999'), context());

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 51,
      cursor: { id: 'photo-z' },
      skip: 1,
      where: { authorId: 'user-a', imageUrl: { not: null } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }));

    mocks.findMany.mockResolvedValue([photo('photo-a'), photo('photo-b')]);
    const response = await getPhotos(new Request('http://localhost/api/user/Robin/photos?limit=1'), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      photos: [expect.objectContaining({ id: 'photo-a' })],
      nextCursor: 'photo-a',
    });
  });

  it('defaults collection pages to 24 photos plus one lookahead row', async () => {
    await getPhotos(new Request('http://localhost/api/user/Robin/photos'), context());

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 25 }));
  });
});
