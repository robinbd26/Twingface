import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), friendshipFindMany: vi.fn(), countMutualFriendsBatch: vi.fn() }));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { friendship: { findMany: mocks.friendshipFindMany } } }));
vi.mock('@/lib/relationship', async () => {
  const actual = await vi.importActual<typeof import('@/lib/relationship')>('@/lib/relationship');
  return { ...actual, countMutualFriendsBatch: mocks.countMutualFriendsBatch };
});

import { GET } from './route';

const viewer = { id: 'user-a', name: 'A', username: 'alice', email: 'alice@example.com', profileImage: null };
const requester = { id: 'user-b', name: 'Bob', username: 'bob', profileImage: null };
const pendingRow = { id: 'friendship-a', createdAt: new Date(), requesterId: 'user-b', requester };

describe('pending friend requests API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.friendshipFindMany.mockResolvedValue([pendingRow]);
    mocks.countMutualFriendsBatch.mockResolvedValue(new Map([['user-b', 3]]));
  });

  it('requires a session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(mocks.friendshipFindMany).not.toHaveBeenCalled();
  });

  it('returns incoming pending requests with mutual friends and no private data', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.friendshipFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'PENDING', recipientId: 'user-a' },
    }));
    const body = await response.json();
    expect(body.requests).toHaveLength(1);
    expect(body.requests[0]).toMatchObject({ id: 'friendship-a', requesterId: 'user-b', mutualFriends: 3 });
    expect(body.requests[0].user).toMatchObject({ id: 'user-b', username: 'bob' });
    expect(JSON.stringify(body)).not.toContain('email');
  });

  it('returns an empty list when there are no requests', async () => {
    mocks.friendshipFindMany.mockResolvedValue([]);
    const body = await (await GET()).json();
    expect(body.requests).toEqual([]);
  });
});
