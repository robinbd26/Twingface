import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  uploadPageMedia: vi.fn(),
  destroyPageMedia: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { page: { findUnique: mocks.findUnique, update: mocks.update, delete: mocks.delete } } }));
vi.mock('@/lib/cloudinary', () => ({ uploadPageMedia: mocks.uploadPageMedia, destroyPageMedia: mocks.destroyPageMedia }));

import { DELETE, GET, PATCH } from './route';

const owner = { id: 'user-a', name: 'Farah', username: 'farah' };
const ownedPage = { id: 'page-a', ownerId: 'user-a', avatarPublicId: null, coverPublicId: null };
const safePage = {
  id: 'page-a',
  name: 'Remote Job Bangladesh',
  handle: 'remotejob.bd',
  category: 'Community',
  bio: null,
  avatarUrl: null,
  coverUrl: null,
  ownerId: 'user-a',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  owner: { id: 'user-a', name: 'Farah Rahman', username: 'farah.rahman', profileImage: null },
};
const context = { params: Promise.resolve({ id: 'page-a' }) };
const jsonPatch = (body: unknown) => new Request('http://localhost/api/pages/page-a', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const deleteRequest = () => new Request('http://localhost/api/pages/page-a', { method: 'DELETE' });

describe('page detail API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ ...owner, email: 'farah@example.com' });
    mocks.findUnique.mockResolvedValue(ownedPage);
    mocks.update.mockResolvedValue(safePage);
    mocks.delete.mockResolvedValue(ownedPage);
    mocks.uploadPageMedia.mockResolvedValue({ imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg' });
    mocks.destroyPageMedia.mockResolvedValue(undefined);
  });

  it('requires authentication for reads and mutations', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET(new Request('http://localhost/api/pages/page-a'), context)).status).toBe(401);
    expect((await PATCH(jsonPatch({ name: 'Nope' }), context)).status).toBe(401);
    expect((await DELETE(deleteRequest(), context)).status).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it('returns 404 when the requested page does not exist', async () => {
    mocks.findUnique.mockResolvedValue(null);
    expect((await GET(new Request('http://localhost/api/pages/page-a'), context)).status).toBe(404);
  });

  it('rejects mutations from non-owners without touching provider assets', async () => {
    mocks.findUnique.mockResolvedValue({ ...ownedPage, ownerId: 'user-b' });
    expect((await PATCH(jsonPatch({ name: 'Hijacked' }), context)).status).toBe(403);
    expect((await DELETE(deleteRequest(), context)).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.uploadPageMedia).not.toHaveBeenCalled();
    expect(mocks.destroyPageMedia).not.toHaveBeenCalled();
  });

  it('updates owned page fields and strips protected mass-assigned fields', async () => {
    const response = await PATCH(jsonPatch({ name: ' Remote Jobs BD ', handle: 'remotejobbd', category: 'Community', bio: ' ', ownerId: 'user-b' }), context);
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'page-a' },
      data: { name: 'Remote Jobs BD', handle: 'remotejobbd', category: 'Community', bio: null },
    }));
  });

  it('rejects invalid categories before touching the database', async () => {
    const response = await PATCH(jsonPatch({ name: 'Remote Job Bangladesh', handle: 'remotejob.bd', category: 'Nope', bio: '' }), context);
    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('returns a safe conflict when the new handle is already taken', async () => {
    mocks.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '6.12.0', meta: { target: ['handle'] } }));
    const response = await PATCH(jsonPatch({ name: 'Remote Job Bangladesh', handle: 'taken.bd', category: 'Community', bio: '' }), context);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ fields: { handle: ['This handle is already taken.'] } });
  });

  it('uploads a new avatar through multipart patches', async () => {
    const form = new FormData();
    form.set('avatar', new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], 'avatar.jpg', { type: 'image/jpeg' }));
    const response = await PATCH(new Request('http://localhost/api/pages/page-a', { method: 'PATCH', body: form }), context);
    expect(response.status).toBe(200);
    expect(mocks.uploadPageMedia).toHaveBeenCalledWith(expect.objectContaining({ pageId: 'page-a', kind: 'avatar', mimeType: 'image/jpeg' }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { avatarUrl: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg', avatarPublicId: 'twingface/pages/page-a/avatar' },
    }));
  });

  it('rejects multipart uploads whose bytes are not a real image', async () => {
    const form = new FormData();
    form.set('cover', new File([new Uint8Array([0x00, 0x01])], 'cover.jpg', { type: 'image/jpeg' }));
    const response = await PATCH(new Request('http://localhost/api/pages/page-a', { method: 'PATCH', body: form }), context);
    expect(response.status).toBe(400);
    expect(mocks.uploadPageMedia).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('deletes an owned page and clears every provider asset under its folder', async () => {
    expect((await DELETE(deleteRequest(), context)).status).toBe(204);
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: 'page-a' } });
    expect(mocks.destroyPageMedia).toHaveBeenCalledWith('page-a');
  });

  it('keeps successful deletion successful if provider cleanup fails', async () => {
    mocks.destroyPageMedia.mockRejectedValue(new Error('provider internals'));
    const response = await DELETE(deleteRequest(), context);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });
});
