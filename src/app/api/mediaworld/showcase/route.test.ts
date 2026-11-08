import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  userFindUnique: vi.fn(),
  showcaseCount: vi.fn(),
  showcaseFindFirst: vi.fn(),
  showcaseFindMany: vi.fn(),
  showcaseCreate: vi.fn(),
  transaction: vi.fn(),
  uploadShowcasePhoto: vi.fn(),
  destroyShowcasePhoto: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: {
  user: { findUnique: mocks.userFindUnique },
  talentShowcaseItem: {
    count: mocks.showcaseCount,
    findFirst: mocks.showcaseFindFirst,
    findMany: mocks.showcaseFindMany,
  },
  $transaction: mocks.transaction,
} }));
vi.mock('@/lib/cloudinary', () => ({
  uploadShowcasePhoto: mocks.uploadShowcasePhoto,
  destroyShowcasePhoto: mocks.destroyShowcasePhoto,
}));

import { GET, POST } from './route';

const viewer = { id: 'user-1', name: 'Amina', username: 'amina' };
const photoItem = { id: 'photo-1', kind: 'PHOTO', url: 'https://res.cloudinary.com/demo/photo.jpg', title: null, position: 0, createdAt: new Date() };
const videoItem = { id: 'video-1', kind: 'VIDEO', url: 'https://youtu.be/abc123', title: 'Reel', position: 3, createdAt: new Date() };

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function photoRequest(name = 'work.png', type = 'image/png') {
  const form = new FormData();
  form.set('image', new File([pngBytes], name, { type }));
  return new Request('http://localhost/api/mediaworld/showcase', { method: 'POST', body: form });
}

function videoRequest(body: unknown) {
  return new Request('http://localhost/api/mediaworld/showcase', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('talent showcase API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.userFindUnique.mockResolvedValue({ accountType: 'PROFESSIONAL' });
    mocks.showcaseCount.mockResolvedValue(0);
    mocks.showcaseFindFirst.mockResolvedValue(null);
    mocks.showcaseCreate.mockResolvedValue(photoItem);
    mocks.uploadShowcasePhoto.mockResolvedValue({ imageUrl: photoItem.url, imagePublicId: 'twingface/mediaworld/showcase/user-1/photo' });
    mocks.destroyShowcasePhoto.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async (callback) => callback({
      talentShowcaseItem: {
        count: mocks.showcaseCount,
        findFirst: mocks.showcaseFindFirst,
        create: mocks.showcaseCreate,
      },
    }));
  });

  it('lists only the signed-in owner portfolio', async () => {
    mocks.showcaseFindMany.mockResolvedValue([photoItem]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.showcaseFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
    expect(await response.json()).toMatchObject({ items: [{ id: 'photo-1' }] });
  });

  it('requires a session and a Media World account type', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await POST(photoRequest())).status).toBe(401);

    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.userFindUnique.mockResolvedValue({ accountType: null });
    expect((await POST(photoRequest())).status).toBe(403);
    expect(mocks.uploadShowcasePhoto).not.toHaveBeenCalled();
  });

  it('uploads a photo, appends it at the next position and returns 201', async () => {
    mocks.showcaseFindFirst.mockResolvedValue({ position: 4 });
    const response = await POST(photoRequest());
    expect(response.status).toBe(201);
    expect(mocks.uploadShowcasePhoto).toHaveBeenCalledWith(expect.objectContaining({ mimeType: 'image/png', userId: 'user-1' }));
    expect(mocks.showcaseCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ kind: 'PHOTO', url: photoItem.url, publicId: 'twingface/mediaworld/showcase/user-1/photo', position: 5 }),
      select: expect.any(Object),
    });
    expect(await response.json()).toMatchObject({ item: { id: 'photo-1' } });
  });

  it('refuses an eleventh photo before touching Cloudinary', async () => {
    mocks.showcaseCount.mockResolvedValue(10);
    const response = await POST(photoRequest());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('10 portfolio photos') });
    expect(mocks.uploadShowcasePhoto).not.toHaveBeenCalled();
  });

  it('rejects files that are not images', async () => {
    const response = await POST(photoRequest('work.txt', 'text/plain'));
    expect(response.status).toBe(400);
    expect(mocks.uploadShowcasePhoto).not.toHaveBeenCalled();
  });

  it('destroys the uploaded asset when the photo row cannot be saved at the limit', async () => {
    mocks.showcaseCount.mockResolvedValueOnce(9).mockResolvedValueOnce(10);
    const response = await POST(photoRequest());
    expect(response.status).toBe(400);
    expect(mocks.destroyShowcasePhoto).toHaveBeenCalledWith('twingface/mediaworld/showcase/user-1/photo');
  });

  it('adds a video link with its caption', async () => {
    mocks.showcaseCreate.mockResolvedValue(videoItem);
    mocks.showcaseFindFirst.mockResolvedValue({ position: 2 });
    const response = await POST(videoRequest({ url: 'https://youtu.be/abc123', title: 'Reel' }));
    expect(response.status).toBe(201);
    expect(mocks.showcaseCreate).toHaveBeenCalledWith({
      data: { userId: 'user-1', kind: 'VIDEO', url: 'https://youtu.be/abc123', title: 'Reel', position: 3 },
      select: expect.any(Object),
    });
    expect(await response.json()).toMatchObject({ item: { id: 'video-1' } });
  });

  it('refuses a sixth video and invalid links', async () => {
    mocks.showcaseCount.mockResolvedValue(5);
    const limited = await POST(videoRequest({ url: 'https://youtu.be/abc123' }));
    expect(limited.status).toBe(400);
    expect(mocks.showcaseCreate).not.toHaveBeenCalled();

    mocks.showcaseCount.mockResolvedValue(0);
    const invalid = await POST(videoRequest({ url: 'javascript:alert(1)' }));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ fields: { url: expect.any(Array) } });
  });
});
