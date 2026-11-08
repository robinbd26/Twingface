import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), friendshipFindMany: vi.fn(), presenceFindMany: vi.fn() }));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { friendship: { findMany: mocks.friendshipFindMany }, userPresence: { findMany: mocks.presenceFindMany } } }));

import { GET } from './route';

const viewer = { id: 'user-a', name: 'A', username: 'alice', email: 'alice@example.com', profileImage: null };
const onlineFriend = { id: 'user-b', name: 'Bob', username: 'bob', profileImage: null };
const offlineFriend = { id: 'user-c', name: 'Cara', username: 'cara', profileImage: null };
const now = new Date();

describe('contacts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.friendshipFindMany.mockResolvedValue([
      { requesterId: 'user-a', recipientId: 'user-b', requester: viewer, recipient: onlineFriend },
      { requesterId: 'user-a', recipientId: 'user-c', requester: viewer, recipient: offlineFriend },
    ]);
    mocks.presenceFindMany.mockResolvedValue([
      { userId: 'user-b', isOnline: true, lastActiveAt: now },
      { userId: 'user-c', isOnline: false, lastActiveAt: new Date(now.getTime() - 25 * 60 * 1000) },
    ]);
  });

  it('requires a session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(mocks.friendshipFindMany).not.toHaveBeenCalled();
  });

  it('returns accepted friends with live online status and an online count', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.contacts).toHaveLength(2);
    // Online friends are sorted first.
    expect(body.contacts[0]).toMatchObject({ id: 'user-b', isOnline: true });
    expect(body.contacts[1]).toMatchObject({ id: 'user-c', isOnline: false });
    expect(body.onlineCount).toBe(1);
    expect(JSON.stringify(body)).not.toContain('email');
  });

  it('marks a friend offline when their last heartbeat is stale', async () => {
    mocks.presenceFindMany.mockResolvedValue([{ userId: 'user-b', isOnline: true, lastActiveAt: new Date(now.getTime() - 10 * 60 * 1000) }]);
    const body = await (await GET()).json();
    expect(body.contacts.find((contact: { id: string }) => contact.id === 'user-b').isOnline).toBe(false);
    expect(body.onlineCount).toBe(0);
  });
});
