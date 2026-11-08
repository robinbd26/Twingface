import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  userFindUnique: vi.fn(),
  followUpsert: vi.fn(),
  followDeleteMany: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: {
  user: { findUnique: mocks.userFindUnique },
  talentFollow: { upsert: mocks.followUpsert, deleteMany: mocks.followDeleteMany },
} }));

import { DELETE, POST } from './route';

const viewer = { id: 'user-b', name: 'Visitor', username: 'visitor' };
const context = { params: Promise.resolve({ username: 'Amina' }) };

describe('Media World talent follow API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.userFindUnique.mockResolvedValue({ id: 'user-a', accountType: 'PROFESSIONAL' });
    mocks.followUpsert.mockResolvedValue({ id: 'follow-a' });
    mocks.followDeleteMany.mockResolvedValue({ count: 1 });
  });

  it('follows a Media World profile idempotently', async () => {
    const response = await POST(new Request('http://localhost/api/mediaworld/talent/Amina/follow', { method: 'POST' }), context);
    expect(response.status).toBe(200);
    expect(mocks.userFindUnique).toHaveBeenCalledWith({ where: { username: 'amina' }, select: { id: true, accountType: true } });
    expect(mocks.followUpsert).toHaveBeenCalledWith({
      where: { followerId_followingId: { followerId: 'user-b', followingId: 'user-a' } },
      create: { followerId: 'user-b', followingId: 'user-a' },
      update: {},
    });
    expect(await response.json()).toEqual({ following: true });
  });

  it('unfollows without failing when the row is already gone', async () => {
    mocks.followDeleteMany.mockResolvedValue({ count: 0 });
    const response = await DELETE(new Request('http://localhost/api/mediaworld/talent/Amina/follow', { method: 'DELETE' }), context);
    expect(response.status).toBe(200);
    expect(mocks.followDeleteMany).toHaveBeenCalledWith({ where: { followerId: 'user-b', followingId: 'user-a' } });
    expect(await response.json()).toEqual({ following: false });
  });

  it('requires a session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await POST(new Request('http://localhost', { method: 'POST' }), context)).status).toBe(401);
    expect((await DELETE(new Request('http://localhost', { method: 'DELETE' }), context)).status).toBe(401);
    expect(mocks.followUpsert).not.toHaveBeenCalled();
    expect(mocks.followDeleteMany).not.toHaveBeenCalled();
  });

  it.each([
    ['missing profile', null, 404],
    ['plain Twingface account', { id: 'user-a', accountType: null }, 404],
    ['own profile', { id: 'user-b', accountType: 'PROFESSIONAL' }, 400],
  ])('rejects %s', async (_label, target, expectedStatus) => {
    mocks.userFindUnique.mockResolvedValue(target);
    expect((await POST(new Request('http://localhost', { method: 'POST' }), context)).status).toBe(expectedStatus);
    expect((await DELETE(new Request('http://localhost', { method: 'DELETE' }), context)).status).toBe(expectedStatus);
    expect(mocks.followUpsert).not.toHaveBeenCalled();
    expect(mocks.followDeleteMany).not.toHaveBeenCalled();
  });
});
