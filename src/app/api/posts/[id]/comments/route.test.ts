import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), findPost: vi.fn(), findManyComments: vi.fn(), createComment: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { post: { findUnique: mocks.findPost }, comment: { findMany: mocks.findManyComments, create: mocks.createComment } } }));

import { GET, POST } from './route';

const user = { id: 'user-a', name: 'Robin', username: 'robin', email: 'private@example.com' };
const author = { id: 'user-b', name: 'Farah', username: 'farah', profileImage: null };
const comment = { id: 'comment-a', content: 'Great post!', createdAt: new Date('2026-10-14'), updatedAt: new Date('2026-10-14'), author };
const context = { params: Promise.resolve({ id: 'post-a' }) };
const request = (method: string, body?: unknown) => new Request('http://localhost/api/posts/post-a/comments', { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

describe('post comments API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(user);
    mocks.findPost.mockResolvedValue({ id: 'post-a' });
    mocks.findManyComments.mockResolvedValue([comment]);
    mocks.createComment.mockResolvedValue(comment);
  });

  it('lists comments using a bounded oldest-first page and safe response', async () => {
    const response = await GET(new Request('http://localhost/api/posts/post-a/comments?limit=999'), context);
    expect(response.status).toBe(200);
    expect(mocks.findManyComments).toHaveBeenCalledWith(expect.objectContaining({ take: 51, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }));
    const body = await response.json();
    expect(body).toMatchObject({ comments: [expect.objectContaining({ content: 'Great post!' })], nextCursor: null });
    expect(JSON.stringify(body)).not.toContain('private@example.com');
    expect(JSON.stringify(body)).not.toContain('passwordHash');
  });

  it('returns 404 for comments on an absent post', async () => {
    mocks.findPost.mockResolvedValue(null);
    expect((await GET(request('GET'), context)).status).toBe(404);
    expect((await POST(request('POST', { content: 'Hello' }), context)).status).toBe(404);
    expect(mocks.createComment).not.toHaveBeenCalled();
  });

  it('requires authentication before creating a comment', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await POST(request('POST', { content: 'Hello' }), context)).status).toBe(401);
    expect(mocks.findPost).not.toHaveBeenCalled();
    expect(mocks.createComment).not.toHaveBeenCalled();
  });

  it('creates a validated comment for the current user only', async () => {
    const response = await POST(request('POST', { content: '  Great post!  ', authorId: 'other-user', postId: 'other-post', createdAt: '2020-01-01' }), context);
    expect(response.status).toBe(201);
    expect(mocks.createComment).toHaveBeenCalledWith(expect.objectContaining({ data: { content: 'Great post!', postId: 'post-a', authorId: 'user-a' } }));
    expect(JSON.stringify(await response.json())).not.toContain('private@example.com');
  });

  it('rejects invalid comment content before persistence', async () => {
    const response = await POST(request('POST', { content: '   ' }), context);
    expect(response.status).toBe(400);
    expect(mocks.createComment).not.toHaveBeenCalled();
  });
});
