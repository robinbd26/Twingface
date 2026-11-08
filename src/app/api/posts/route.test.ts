import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), findMany: vi.fn(), create: vi.fn(), uploadPostImage: vi.fn(), destroyPostImage: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { post: { findMany: mocks.findMany, create: mocks.create } } }));
vi.mock('@/lib/cloudinary', () => ({ uploadPostImage: mocks.uploadPostImage, destroyPostImage: mocks.destroyPostImage }));

import { GET, POST } from './route';

const author = { id: 'author-a', name: 'Robin', username: 'robin', profileImage: null };
const post = { id: 'post-a', content: 'Hello', imageUrl: 'https://res.cloudinary.com/twingface/image/upload/post.jpg', youtubeUrl: null, authorId: 'author-a', createdAt: new Date('2026-10-09'), updatedAt: new Date('2026-10-09'), author };
const jsonRequest = (body: unknown) => new Request('http://localhost/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const formRequest = ({ content, image, feelingActivity, youtubeUrl, extra }: { content?: string; image?: File; feelingActivity?: string; youtubeUrl?: string; extra?: Record<string, string> } = {}) => {
  const form = new FormData();
  if (content !== undefined) form.set('content', content);
  if (image) form.set('image', image);
  if (feelingActivity !== undefined) form.set('feelingActivity', feelingActivity);
  if (youtubeUrl !== undefined) form.set('youtubeUrl', youtubeUrl);
  for (const [key, value] of Object.entries(extra ?? {})) form.set(key, value);
  return new Request('http://localhost/api/posts', { method: 'POST', body: form });
};
const imageBytes = (type: string, size: number) => {
  const bytes = new Uint8Array(Math.max(size, 12));
  if (type === 'image/jpeg') bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  if (type === 'image/png') bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (type === 'image/gif') bytes.set(new TextEncoder().encode('GIF89a'));
  if (type === 'image/webp') bytes.set(new TextEncoder().encode('RIFF1234WEBP'));
  return bytes;
};
const image = (type = 'image/jpeg', size = 32) => new File([imageBytes(type, size)], 'post.jpg', { type });

describe('posts collection API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ ...author, email: 'private@example.com' });
    mocks.findMany.mockResolvedValue([post]);
    mocks.create.mockResolvedValue(post);
    mocks.uploadPostImage.mockResolvedValue({ imageUrl: post.imageUrl, imagePublicId: 'twingface/posts/author-a/post-a' });
  });

  it('caps feed requests and returns only safe post fields', async () => {
    const response = await GET(new Request('http://localhost/api/posts?limit=999'));
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 51, orderBy: { createdAt: 'desc' } }));
    const body = await response.json();
    expect(body.posts).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain('private@example.com');
    expect(JSON.stringify(body)).not.toContain('passwordHash');
    expect(JSON.stringify(body)).not.toContain('imagePublicId');
  });

  it('rejects unauthenticated image creation before parsing or upload', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await POST(formRequest({ image: image() }))).status).toBe(401);
    expect(mocks.uploadPostImage).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('creates an image-only post for the current user', async () => {
    const response = await POST(formRequest({ image: image() }));
    expect(response.status).toBe(201);
    expect(mocks.uploadPostImage).toHaveBeenCalledWith(expect.objectContaining({ mimeType: 'image/jpeg', userId: 'author-a' }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: { content: '', authorId: 'author-a', imageUrl: post.imageUrl, imagePublicId: 'twingface/posts/author-a/post-a', feelingActivity: null, youtubeUrl: null } }));
  });

  it('trims text while creating a text-and-image post', async () => {
    const response = await POST(formRequest({ content: ' Hello ', image: image('image/png') }));
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ content: 'Hello' }) }));
  });

  it('preserves JSON text-only post creation without uploading', async () => {
    const response = await POST(jsonRequest({ content: ' Hello ' }));
    expect(response.status).toBe(201);
    expect(mocks.uploadPostImage).not.toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: { content: 'Hello', authorId: 'author-a', imageUrl: null, imagePublicId: null, feelingActivity: null, youtubeUrl: null } }));
  });

  it('creates canonical video posts from JSON and multipart input', async () => {
    expect((await POST(jsonRequest({ youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' }))).status).toBe(201);
    expect(mocks.create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', authorId: 'author-a' }) }));
    expect((await POST(formRequest({ content: 'Watch this', youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }))).status).toBe(201);
    expect(mocks.create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ content: 'Watch this', youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }) }));
  });

  it('rejects invalid video URLs before persistence', async () => {
    expect((await POST(jsonRequest({ youtubeUrl: 'https://evil.example/video' }))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('persists a server-validated feeling from JSON or multipart input', async () => {
    const jsonResponse = await POST(jsonRequest({ content: ' Hello ', feelingActivity: 'feeling:happy' }));
    expect(jsonResponse.status).toBe(201);
    expect(mocks.create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ content: 'Hello', feelingActivity: 'feeling:happy' }) }));

    const formResponse = await POST(formRequest({ image: image(), feelingActivity: 'activity:watching' }));
    expect(formResponse.status).toBe(201);
    expect(mocks.create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ feelingActivity: 'activity:watching' }) }));
  });

  it('rejects unknown selections before upload or persistence', async () => {
    const response = await POST(formRequest({ content: 'Hello', image: image(), feelingActivity: 'feeling:admin', extra: { authorId: 'other-user', label: 'Admin', emoji: '🚫' } }));
    expect(response.status).toBe(400);
    expect(mocks.uploadPostImage).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects non-string JSON selection values before persistence', async () => {
    const response = await POST(jsonRequest({ content: 'Hello', feelingActivity: 42 }));
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('does not allow a feeling alone to create an empty post', async () => {
    const response = await POST(jsonRequest({ feelingActivity: 'feeling:happy' }));
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects missing content, unsupported files, and oversized files before upload', async () => {
    expect((await POST(formRequest())).status).toBe(400);
    expect((await POST(formRequest({ image: image('application/pdf') }))).status).toBe(400);
    expect((await POST(formRequest({ image: image('image/jpeg', 5 * 1024 * 1024 + 1) }))).status).toBe(400);
    expect(mocks.uploadPostImage).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects a file whose bytes do not match its claimed image type', async () => {
    const fakeImage = new File([new TextEncoder().encode('not an image')], 'post.jpg', { type: 'image/jpeg' });
    expect((await POST(formRequest({ image: fakeImage }))).status).toBe(400);
    expect(mocks.uploadPostImage).not.toHaveBeenCalled();
  });

  it('derives author identity and image metadata on the server', async () => {
    const response = await POST(formRequest({ content: 'Hello', image: image(), extra: { authorId: 'other-user', imageUrl: 'https://evil.example/x.jpg', imagePublicId: 'other-id' } }));
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ authorId: 'author-a', imageUrl: post.imageUrl, imagePublicId: 'twingface/posts/author-a/post-a' }) }));
  });

  it('maps upload failures to a safe provider error', async () => {
    mocks.uploadPostImage.mockRejectedValue(new Error('provider account details'));
    const response = await POST(formRequest({ image: image() }));
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain('provider account details');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('cleans up an uploaded image when database creation fails', async () => {
    mocks.create.mockRejectedValue(new Error('database internals'));
    const response = await POST(formRequest({ image: image() }));
    expect(response.status).toBe(500);
    expect(mocks.destroyPostImage).toHaveBeenCalledWith('twingface/posts/author-a/post-a');
    expect(JSON.stringify(await response.json())).not.toContain('database internals');
  });
});
