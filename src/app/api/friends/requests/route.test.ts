import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  userFindUnique: vi.fn(),
  friendshipFindUnique: vi.fn(),
  friendshipCreate: vi.fn(),
  friendshipFindMany: vi.fn(),
  notificationCreate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    friendship: {
      findUnique: mocks.friendshipFindUnique,
      create: mocks.friendshipCreate,
      findMany: mocks.friendshipFindMany,
    },
    notification: { create: mocks.notificationCreate },
  },
}));

import { GET, POST } from './route';

const viewer = { id: 'user-a', name: 'A', username: 'alice', email: 'alice@example.com', profileImage: null };
const target = { id: 'user-b', name: 'B', username: 'bob', profileImage: null };
const friendship = {
  id: 'friendship-a', requesterId: 'user-a', recipientId: 'user-b', status: 'PENDING',
  createdAt: new Date(), updatedAt: new Date(), requester: { ...viewer, email: undefined }, recipient: target,
};
const request = (body: unknown) => new Request('http://localhost/api/friends/requests', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

describe('friend requests collection API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.userFindUnique.mockResolvedValue(target);
    mocks.friendshipFindUnique.mockResolvedValue(null);
    mocks.friendshipCreate.mockResolvedValue(friendship);
    mocks.friendshipFindMany.mockResolvedValue([friendship]);
    mocks.notificationCreate.mockResolvedValue({
      id: 'n1', type: 'FRIEND_REQUEST', entityId: 'friendship-a', isRead: false,
      createdAt: new Date(), actor: { id: 'user-a', name: 'A', username: 'alice', profileImage: null },
    });
  });

  it('requires a session before reading or writing', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await POST(request({ username: 'bob' }))).status).toBe(401);
    expect(mocks.friendshipCreate).not.toHaveBeenCalled();
  });

  it('creates a pending request from the session user only', async () => {
    const response = await POST(request({ username: 'bob' }));
    expect(response.status).toBe(201);
    expect(mocks.friendshipCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ requesterId: 'user-a', recipientId: 'user-b', status: 'PENDING', pairKey: 'user-a:user-b' }),
    }));
    const body = await response.json();
    expect(body.request).toMatchObject({ id: 'friendship-a', status: 'PENDING' });
    expect(JSON.stringify(body)).not.toContain('passwordHash');
    // The recipient gets a friend-request notification (best-effort).
    expect(mocks.notificationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'FRIEND_REQUEST', recipientId: 'user-b', actorId: 'user-a', entityId: 'friendship-a' }),
    }));
  });

  it('rejects self requests, unknown users, and duplicate requests safely', async () => {
    mocks.userFindUnique.mockResolvedValue({ id: 'user-a' });
    expect((await POST(request({ username: 'alice' }))).status).toBe(400);
    mocks.userFindUnique.mockResolvedValue(null);
    expect((await POST(request({ username: 'nobody' }))).status).toBe(404);
    mocks.userFindUnique.mockResolvedValue(target);
    mocks.friendshipFindUnique.mockResolvedValue(friendship);
    expect((await POST(request({ username: 'bob' }))).status).toBe(409);
    expect(mocks.friendshipCreate).not.toHaveBeenCalled();
  });

  it('lists pending incoming and outgoing requests without private user data', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.friendshipFindMany).toHaveBeenCalled();
    const body = await response.json();
    expect(body.outgoing).toHaveLength(1);
    expect(body.incoming).toEqual([]);
    expect(JSON.stringify(body)).not.toContain('email');
  });
});
