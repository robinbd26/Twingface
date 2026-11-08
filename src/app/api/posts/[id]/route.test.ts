import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(), destroyPostImage: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { post: { findUnique: mocks.findUnique, update: mocks.update, delete: mocks.delete } } }));
vi.mock('@/lib/cloudinary', () => ({ destroyPostImage: mocks.destroyPostImage }));

import { DELETE, GET, PATCH } from './route';

const author = { id: 'author-a', name: 'Robin', username: 'robin', profileImage: null };
const post = { id: 'post-a', content: 'Hello', imageUrl: null, authorId: 'author-a', createdAt: new Date(), updatedAt: new Date(), author };
const context = { params: Promise.resolve({ id: 'post-a' }) };
const request = (method: string, body?: unknown) => new Request('http://localhost/api/posts/post-a', { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

describe('single post API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ ...author, email: 'private@example.com' });
    mocks.findUnique.mockResolvedValue(post);
    mocks.update.mockResolvedValue(post);
    mocks.delete.mockResolvedValue(post);
    mocks.destroyPostImage.mockResolvedValue(undefined);
  });

  it('returns 404 when a requested post does not exist', async () => {
    mocks.findUnique.mockResolvedValue(null);
    expect((await GET(request('GET'), context)).status).toBe(404);
  });

  it('rejects non-owner mutations without deleting a provider asset', async () => {
    mocks.findUnique.mockResolvedValue({ authorId: 'other-user', imagePublicId: 'twingface/posts/other/post-a' });
    expect((await PATCH(request('PATCH', { content: 'new' }), context)).status).toBe(403);
    expect((await DELETE(request('DELETE'), context)).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.destroyPostImage).not.toHaveBeenCalled();
  });

  it('updates only an owned post and rejects protected mass-assigned fields', async () => {
    const response = await PATCH(request('PATCH', { content: ' Updated ', authorId: 'other-user' }), context);
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'post-a' }, data: { content: 'Updated' } }));
  });

  it('requires authentication before mutations or media cleanup', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await DELETE(request('DELETE'), context)).status).toBe(401);
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.destroyPostImage).not.toHaveBeenCalled();
  });

  it('deletes an owned text-only post without provider cleanup', async () => {
    mocks.findUnique.mockResolvedValue({ authorId: 'author-a', imagePublicId: null });
    expect((await DELETE(request('DELETE'), context)).status).toBe(204);
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: 'post-a' } });
    expect(mocks.destroyPostImage).not.toHaveBeenCalled();
  });

  it('deletes an owned image post then requests provider cleanup', async () => {
    mocks.findUnique.mockResolvedValue({ authorId: 'author-a', imagePublicId: 'twingface/posts/author-a/post-a' });
    expect((await DELETE(request('DELETE'), context)).status).toBe(204);
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: 'post-a' } });
    expect(mocks.destroyPostImage).toHaveBeenCalledWith('twingface/posts/author-a/post-a');
  });

  it('keeps successful deletion successful if provider cleanup fails', async () => {
    mocks.findUnique.mockResolvedValue({ authorId: 'author-a', imagePublicId: 'twingface/posts/author-a/post-a' });
    mocks.destroyPostImage.mockRejectedValue(new Error('provider internals'));
    const response = await DELETE(request('DELETE'), context);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });
});
