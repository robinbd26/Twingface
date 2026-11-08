import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  update: vi.fn(),
  uploadProfileMedia: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { user: { update: mocks.update } } }));
vi.mock('@/lib/cloudinary', () => ({ uploadProfileMedia: mocks.uploadProfileMedia }));

import { POST } from './route';

const safeProfile = {
  id: 'user-a',
  name: 'Farah Rahman',
  username: 'farah.rahman',
  bio: null,
  profileImage: 'https://res.cloudinary.com/twingface/image/upload/avatar.jpg',
  coverImage: null,
  createdAt: new Date('2026-01-01'),
};

function imageFile(type = 'image/jpeg', bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])) {
  return new File([bytes], 'image.jpg', { type });
}

function mediaRequest(kind: string, image: File | null, extra: Record<string, string> = {}) {
  const body = new FormData();
  body.set('kind', kind);
  if (image) body.set('image', image);
  Object.entries(extra).forEach(([key, value]) => body.set(key, value));
  return new Request('http://localhost/api/profile/media', { method: 'POST', body });
}

describe('POST /api/profile/media', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-a', name: 'Farah', username: 'farah', email: 'farah@example.com' });
    mocks.uploadProfileMedia.mockResolvedValue({ imageUrl: safeProfile.profileImage });
    mocks.update.mockResolvedValue(safeProfile);
  });

  it('rejects unauthenticated requests before parsing or uploading', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await POST(mediaRequest('profile', imageFile()));

    expect(response.status).toBe(401);
    expect(mocks.uploadProfileMedia).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([
    ['missing image', mediaRequest('profile', null)],
    ['invalid kind', mediaRequest('avatar', imageFile())],
    ['unsupported MIME type', mediaRequest('profile', imageFile('text/plain'))],
    ['invalid image signature', mediaRequest('profile', imageFile('image/jpeg', new Uint8Array([1, 2, 3])))],
    ['oversized file', mediaRequest('profile', imageFile('image/jpeg', new Uint8Array(5 * 1024 * 1024 + 1)))],
  ])('rejects %s before an upload', async (_description, request) => {
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mocks.uploadProfileMedia).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('updates only the session user profile image despite mass-assignment fields', async () => {
    const response = await POST(mediaRequest('profile', imageFile(), {
      userId: 'user-b',
      coverImage: 'https://attacker.invalid/cover.jpg',
      passwordHash: 'not-allowed',
      imagePublicId: 'not-allowed',
    }));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-a' },
      data: { profileImage: safeProfile.profileImage },
    }));
    const body = await response.json();
    expect(body.profile).toMatchObject({ id: 'user-a', profileImage: safeProfile.profileImage });
    expect(JSON.stringify(body)).not.toContain('passwordHash');
    expect(JSON.stringify(body)).not.toContain('imagePublicId');
  });

  it('updates only the current user cover image', async () => {
    mocks.uploadProfileMedia.mockResolvedValue({ imageUrl: 'https://res.cloudinary.com/twingface/image/upload/cover.jpg' });
    mocks.update.mockResolvedValue({ ...safeProfile, coverImage: 'https://res.cloudinary.com/twingface/image/upload/cover.jpg' });

    const response = await POST(mediaRequest('cover', imageFile()));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-a' },
      data: { coverImage: 'https://res.cloudinary.com/twingface/image/upload/cover.jpg' },
    }));
  });

  it('maps a provider failure to a safe response', async () => {
    mocks.uploadProfileMedia.mockRejectedValue(new Error('provider details must stay private'));

    const response = await POST(mediaRequest('profile', imageFile()));

    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain('provider details');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('maps a persistence failure to a safe response', async () => {
    mocks.update.mockRejectedValue(new Error('database connection details must stay private'));

    const response = await POST(mediaRequest('profile', imageFile()));

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('database connection details');
  });
});
