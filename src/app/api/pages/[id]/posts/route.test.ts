import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  uploadPagePostImage: vi.fn(),
  destroyPostImage: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { page: { findUnique: mocks.findUnique }, pagePost: { findMany: mocks.findMany, create: mocks.create } } }));
vi.mock('@/lib/cloudinary', () => ({ uploadPagePostImage: mocks.uploadPagePostImage, destroyPostImage: mocks.destroyPostImage }));

import { GET, POST } from './route';

const owner = { id: 'user-a', name: 'Farah', username: 'farah', email: 'farah@example.com' };
const pageRow = { id: 'page-a', ownerId: 'user-a' };
const pagePost = {
  id: 'pp-a',
  content: 'Hello fans',
  imageUrl: null,
  imagePublicId: null,
  pageId: 'page-a',
  authorId: 'user-a',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  author: { id: 'user-a', name: 'Farah Rahman', username: 'farah.rahman', profileImage: null },
};
const context = { params: Promise.resolve({ id: 'page-a' }) };
const getRequest = () => new Request('http://localhost/api/pages/page-a/posts');
const postRequest = (body: unknown) => new Request('http://localhost/api/pages/page-a/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
const multipartRequest = (content: string, image: File | null) => {
  const form = new FormData();
  form.set('content', content);
  if (image) form.set('image', image);
  return new Request('http://localhost/api/pages/page-a/posts', { method: 'POST', body: form });
};

describe('page timeline API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(owner);
    mocks.findUnique.mockResolvedValue(pageRow);
    mocks.findMany.mockResolvedValue([pagePost]);
    mocks.create.mockResolvedValue(pagePost);
    mocks.uploadPagePostImage.mockResolvedValue({ imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/post.jpg', imagePublicId: 'twingface/pages/page-a/posts/abc' });
    mocks.destroyPostImage.mockResolvedValue(undefined);
  });

  it('requires authentication for the timeline and for posting', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET(getRequest(), context)).status).toBe(401);
    expect((await POST(postRequest({ content: 'Hi' }), context)).status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('returns 404 when the page does not exist', async () => {
    mocks.findUnique.mockResolvedValue(null);
    expect((await GET(getRequest(), context)).status).toBe(404);
    expect((await POST(postRequest({ content: 'Hi' }), context)).status).toBe(404);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('lists the page timeline newest first', async () => {
    const response = await GET(getRequest(), context);
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { pageId: 'page-a' },
      orderBy: { createdAt: 'desc' },
    }));
    const body = await response.json();
    expect(body.posts).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain('passwordHash');
  });

  it('rejects posting by non-owners', async () => {
    mocks.findUnique.mockResolvedValue({ ...pageRow, ownerId: 'user-b' });
    expect((await POST(postRequest({ content: 'Hi' }), context)).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects empty or oversized post content before creating', async () => {
    expect((await POST(postRequest({ content: '   ' }), context)).status).toBe(400);
    expect((await POST(postRequest({ content: 'x'.repeat(501) }), context)).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('creates an owned page post with trimmed content', async () => {
    const response = await POST(postRequest({ content: '  Hello fans  ' }), context);
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { content: 'Hello fans', pageId: 'page-a', authorId: 'user-a', imageUrl: null, imagePublicId: null },
    }));
    const body = await response.json();
    expect(body.post).toMatchObject({ id: 'pp-a', content: 'Hello fans' });
  });

  it('uploads and stores a page post image through multipart posts', async () => {
    const image = new File([jpegBytes], 'photo.jpg', { type: 'image/jpeg' });
    const response = await POST(multipartRequest('Check this out', image), context);
    expect(response.status).toBe(201);
    expect(mocks.uploadPagePostImage).toHaveBeenCalledWith(expect.objectContaining({ pageId: 'page-a', mimeType: 'image/jpeg' }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { content: 'Check this out', pageId: 'page-a', authorId: 'user-a', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/post.jpg', imagePublicId: 'twingface/pages/page-a/posts/abc' },
    }));
  });

  it('rejects multipart images that fail mime or magic-byte validation', async () => {
    const badMime = new File([jpegBytes], 'photo.txt', { type: 'text/plain' });
    expect((await POST(multipartRequest('Hi', badMime), context)).status).toBe(400);
    const badBytes = new File([new Uint8Array([0x00, 0x01])], 'photo.jpg', { type: 'image/jpeg' });
    expect((await POST(multipartRequest('Hi', badBytes), context)).status).toBe(400);
    expect(mocks.uploadPagePostImage).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('returns a provider error without creating the post when uploads fail', async () => {
    mocks.uploadPagePostImage.mockRejectedValue(new Error('provider internals'));
    const image = new File([jpegBytes], 'photo.jpg', { type: 'image/jpeg' });
    const response = await POST(multipartRequest('Check this out', image), context);
    expect(response.status).toBe(502);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});