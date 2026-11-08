import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), findMany: vi.fn(), create: vi.fn() }));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { page: { findMany: mocks.findMany, create: mocks.create } } }));

import { GET, POST } from './route';

const valid = { name: 'Remote Job Bangladesh', handle: 'remotejob.bd', category: 'Community', bio: 'Jobs for everyone' };
const safePage = {
  id: 'page-a',
  ...valid,
  ownerId: 'user-a',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  owner: { id: 'user-a', name: 'Farah Rahman', username: 'farah.rahman', profileImage: null },
};
const request = (body: unknown) => new Request('http://localhost/api/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const authedUser = { id: 'user-a', name: 'Farah', username: 'farah', email: 'farah@example.com' };

describe('pages API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(authedUser);
    mocks.create.mockResolvedValue(safePage);
    mocks.findMany.mockResolvedValue([safePage]);
  });

  it('rejects unauthenticated creation and listing', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const postResponse = await POST(request(valid));
    expect(postResponse.status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
    const getResponse = await GET();
    expect(getResponse.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('lists only the authenticated user\'s pages', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'user-a' } }));
    const body = await response.json();
    expect(body.pages).toHaveLength(1);
    expect(body.pages[0]).toMatchObject({ handle: 'remotejob.bd' });
    expect(JSON.stringify(body)).not.toContain('passwordHash');
  });

  it('creates a page owned by the authenticated user', async () => {
    const response = await POST(request(valid));
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { name: valid.name, handle: valid.handle, category: valid.category, bio: valid.bio, ownerId: 'user-a' },
    }));
    const body = await response.json();
    expect(body.page).toMatchObject({ id: 'page-a', ownerId: 'user-a' });
  });

  it('rejects invalid category and short names before creating', async () => {
    const badCategory = await POST(request({ ...valid, category: 'Nope' }));
    expect(badCategory.status).toBe(400);
    const shortName = await POST(request({ ...valid, name: 'A' }));
    expect(shortName.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('returns a safe conflict error for duplicate handles', async () => {
    mocks.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '6.12.0', meta: { target: ['handle'] } }));
    const response = await POST(request(valid));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ fields: { handle: ['This handle is already taken.'] } });
  });
});