import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  destroyShowcasePhoto: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { talentShowcaseItem: {
  findFirst: mocks.findFirst,
  update: mocks.update,
  delete: mocks.delete,
} } }));
vi.mock('@/lib/cloudinary', () => ({ destroyShowcasePhoto: mocks.destroyShowcasePhoto }));

import { DELETE, PATCH } from './route';

const viewer = { id: 'user-1' };
const context = { params: Promise.resolve({ id: 'item-1' }) };

function patch(body: unknown) {
  return new Request('http://localhost/api/mediaworld/showcase/item-1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const photo = { id: 'item-1', kind: 'PHOTO', publicId: 'twingface/mediaworld/showcase/user-1/photo' };
const video = { id: 'item-1', kind: 'VIDEO', publicId: null };

describe('single showcase item API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.findFirst.mockResolvedValue(photo);
    mocks.update.mockResolvedValue({ id: 'item-1', kind: 'PHOTO', url: 'https://res.cloudinary.com/demo/photo.jpg', title: 'New caption', position: 0, createdAt: new Date() });
    mocks.delete.mockResolvedValue({});
    mocks.destroyShowcasePhoto.mockResolvedValue(undefined);
  });

  it('requires a session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await PATCH(patch({ title: 'x' }), context)).status).toBe(401);
    expect((await DELETE(new Request('http://localhost', { method: 'DELETE' }), context)).status).toBe(401);
  });

  it('only edits or deletes items owned by the caller', async () => {
    mocks.findFirst.mockResolvedValue(null);
    expect((await PATCH(patch({ title: 'x' }), context)).status).toBe(404);
    expect((await DELETE(new Request('http://localhost', { method: 'DELETE' }), context)).status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: { id: 'item-1', userId: 'user-1' }, select: expect.any(Object) });
  });

  it('updates a photo caption but never lets a client swap the uploaded URL', async () => {
    const ok = await PATCH(patch({ title: 'On set' }), context);
    expect(ok.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: { title: 'On set' } }));

    const rejected = await PATCH(patch({ url: 'https://evil.example.com/photo.jpg' }), context);
    expect(rejected.status).toBe(400);
  });

  it('updates a video link and caption', async () => {
    mocks.findFirst.mockResolvedValue(video);
    mocks.update.mockResolvedValue({ id: 'item-1', kind: 'VIDEO', url: 'https://vimeo.com/123456789', title: 'New reel', position: 0, createdAt: new Date() });
    const response = await PATCH(patch({ title: 'New reel', url: 'https://vimeo.com/123456789' }), context);
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { title: 'New reel', url: 'https://vimeo.com/123456789' },
    }));
  });

  it('refuses to clear a video link', async () => {
    mocks.findFirst.mockResolvedValue(video);
    expect((await PATCH(patch({ url: '' }), context)).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('removes the database row first and then cleans up the Cloudinary photo', async () => {
    const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), context);
    expect(response.status).toBe(200);
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
    expect(mocks.destroyShowcasePhoto).toHaveBeenCalledWith(photo.publicId);
    expect(await response.json()).toEqual({ deleted: true });
  });

  it('does not call Cloudinary for videos', async () => {
    mocks.findFirst.mockResolvedValue(video);
    await DELETE(new Request('http://localhost', { method: 'DELETE' }), context);
    expect(mocks.destroyShowcasePhoto).not.toHaveBeenCalled();
  });

  it('keeps the row when deletion fails', async () => {
    mocks.delete.mockRejectedValue(new Error('db down'));
    const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), context);
    expect(response.status).toBe(500);
    expect(mocks.destroyShowcasePhoto).not.toHaveBeenCalled();
  });
});
