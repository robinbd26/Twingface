import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ userFindUnique: vi.fn(), friendshipFindMany: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: mocks.userFindUnique }, friendship: { findMany: mocks.friendshipFindMany } } }));

import { GET } from './route';

const alice = { id: 'user-a', name: 'Alice', username: 'alice', profileImage: null };
const bob = { id: 'user-b', name: 'Bob', username: 'bob', profileImage: null };

describe('public friends API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUnique.mockResolvedValue(alice);
    mocks.friendshipFindMany.mockResolvedValue([{ id: 'f-a', requesterId: 'user-a', recipientId: 'user-b', status: 'ACCEPTED', requester: alice, recipient: bob }]);
  });

  it('returns only accepted other-party safe user records with cursor metadata', async () => {
    const response = await GET(new Request('http://localhost/api/user/alice/friends?limit=1'), { params: Promise.resolve({ username: 'alice' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.friends).toEqual([bob]);
    expect(body.nextCursor).toBeNull();
    expect(JSON.stringify(body)).not.toContain('requesterId');
  });

  it('returns 404 for an unknown profile', async () => {
    mocks.userFindUnique.mockResolvedValue(null);
    expect((await GET(new Request('http://localhost'), { params: Promise.resolve({ username: 'none' }) })).status).toBe(404);
  });
});
