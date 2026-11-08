import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(), notificationCreate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { friendship: mocks, notification: { create: mocks.notificationCreate } } }));

import { DELETE, PATCH } from './route';

const viewer = { id: 'user-b', name: 'B', username: 'bob', email: 'bob@example.com', profileImage: null };
const pending = { id: 'request-a', requesterId: 'user-a', recipientId: 'user-b', status: 'PENDING' };
const context = { params: Promise.resolve({ id: 'request-a' }) };
const request = (body: unknown) => new Request('http://localhost/api/friends/requests/request-a', {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

describe('friend request item API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.findUnique.mockResolvedValue(pending);
    mocks.update.mockResolvedValue({ ...pending, status: 'ACCEPTED' });
    mocks.delete.mockResolvedValue(pending);
    mocks.notificationCreate.mockResolvedValue({
      id: 'n1', type: 'FRIEND_ACCEPT', entityId: 'request-a', isRead: false,
      createdAt: new Date(), actor: { id: 'user-b', name: 'B', username: 'bob', profileImage: null },
    });
  });

  it('allows only the recipient to accept or reject a pending request', async () => {
    const response = await PATCH(request({ action: 'accept' }), context);
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'ACCEPTED' } }));
    // Accepting notifies the original requester (best-effort).
    expect(mocks.notificationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'FRIEND_ACCEPT', recipientId: 'user-a', actorId: 'user-b', entityId: 'request-a' }),
    }));
    mocks.getCurrentUser.mockResolvedValue({ ...viewer, id: 'user-z' });
    expect((await PATCH(request({ action: 'reject' }), context)).status).toBe(403);
  });

  it('does not notify on reject', async () => {
    mocks.update.mockResolvedValue({ ...pending, status: 'REJECTED' });
    const response = await PATCH(request({ action: 'reject' }), context);
    expect(response.status).toBe(200);
    expect(mocks.notificationCreate).not.toHaveBeenCalled();
  });

  it('allows the requester to cancel pending and either friend to unfriend accepted', async () => {
    mocks.getCurrentUser.mockResolvedValue({ ...viewer, id: 'user-a' });
    expect((await DELETE(new Request('http://localhost'), context)).status).toBe(204);
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: 'request-a' } });
    mocks.findUnique.mockResolvedValue({ ...pending, status: 'ACCEPTED' });
    mocks.getCurrentUser.mockResolvedValue(viewer);
    expect((await DELETE(new Request('http://localhost'), context)).status).toBe(204);
  });

  it('does not modify missing, unauthenticated, or unauthorised requests', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await PATCH(request({ action: 'accept' }), context)).status).toBe(401);
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.findUnique.mockResolvedValue(null);
    expect((await DELETE(new Request('http://localhost'), context)).status).toBe(404);
    expect(mocks.delete).not.toHaveBeenCalled();
  });
});
