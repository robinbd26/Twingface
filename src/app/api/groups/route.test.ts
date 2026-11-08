import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), findMany: vi.fn(), create: vi.fn(), transaction: vi.fn() }));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { group: { findMany: mocks.findMany }, $transaction: mocks.transaction } }));

import { GET, POST } from './route';

const valid = {
  name: 'Dhaka Developers',
  handle: 'dhaka-developers',
  description: 'Builders in Bangladesh',
  privacy: 'PRIVATE',
  postingPolicy: 'ADMINS_ONLY',
  coverImage: null,
};
const group = {
  id: 'group-a',
  ...valid,
  creatorId: 'user-a',
  createdAt: new Date('2026-10-15T00:00:00.000Z'),
  updatedAt: new Date('2026-10-15T00:00:00.000Z'),
  creator: { id: 'user-a', name: 'Farah Rahman', username: 'farah', profileImage: null },
  _count: { memberships: 1 },
};
const authedUser = { id: 'user-a', name: 'Farah', username: 'farah', email: 'farah@example.com', profileImage: null };
const request = (body: unknown) => new Request('http://localhost/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('groups collection API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(authedUser);
    mocks.findMany.mockResolvedValue([group]);
    mocks.create.mockResolvedValue(group);
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({ group: { create: mocks.create } }));
  });

  it('discovers only public groups for anonymous visitors with a bounded query', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await GET(new Request('http://localhost/api/groups?query=dhaka&limit=999'));
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ privacy: 'PUBLIC', name: { contains: 'dhaka', mode: 'insensitive' } }),
      take: 51,
    }));
    const body = await response.json();
    expect(body.groups).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain('passwordHash');
  });

  it('requires authentication for the viewer membership scope and returns only approved memberships', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    await expect(GET(new Request('http://localhost/api/groups?scope=mine'))).resolves.toMatchObject({ status: 401 });
    expect(mocks.findMany).not.toHaveBeenCalled();

    mocks.getCurrentUser.mockResolvedValue(authedUser);
    await GET(new Request('http://localhost/api/groups?scope=mine'));
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { memberships: { some: { userId: 'user-a', status: 'APPROVED' } } },
    }));
  });

  it('creates a group and its approved admin membership atomically for the current user', async () => {
    const response = await POST(request(valid));
    expect(response.status).toBe(201);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        creatorId: 'user-a',
        memberships: { create: { userId: 'user-a', role: 'ADMIN', status: 'APPROVED' } },
      }),
    }));
    await expect(response.json()).resolves.toMatchObject({ group: { id: 'group-a', handle: 'dhaka-developers' } });
  });

  it('rejects unauthenticated and invalid creation before a database write', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await POST(request(valid))).status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();

    mocks.getCurrentUser.mockResolvedValue(authedUser);
    expect((await POST(request({ ...valid, handle: 'bad handle' }))).status).toBe(400);
    expect((await POST(request({ ...valid, creatorId: 'attacker', role: 'MEMBER', status: 'PENDING' }))).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('returns a safe conflict for duplicate handles', async () => {
    mocks.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '6.19.3', meta: { target: ['handle'] } }));
    const response = await POST(request(valid));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ fields: { handle: ['This handle is already taken.'] } });
  });
});
