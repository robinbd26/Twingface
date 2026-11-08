import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({
  prisma: { notification: { findMany: mocks.findMany, count: mocks.count, updateMany: mocks.updateMany } },
}));

import { GET, POST } from './route';

const viewer = { id: 'user-a', name: 'A', username: 'alice', email: null, profileImage: null };
const rows = [{
  id: 'n1', type: 'FRIEND_REQUEST', entityId: 'friendship-1', isRead: false,
  createdAt: new Date(), actor: { id: 'user-b', name: 'B', username: 'bob', profileImage: null },
}];

const getRequest = (query = '') => new Request(`http://localhost/api/notifications${query}`);
const postRequest = (body: unknown) => new Request('http://localhost/api/notifications', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

describe('notifications collection API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.findMany.mockResolvedValue(rows);
    mocks.count.mockResolvedValue(1);
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it('requires a session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET(getRequest())).status).toBe(401);
    expect((await POST(postRequest({ all: true }))).status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('lists only non-message notifications scoped to the session user with an unread count', async () => {
    const response = await GET(getRequest('?limit=10'));
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { recipientId: 'user-a', type: { not: 'MESSAGE' } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }));
    const body = await response.json();
    expect(body.notifications).toHaveLength(1);
    expect(body.unreadCount).toBe(1);
    // Never leak private user fields through the safe projection.
    expect(JSON.stringify(body)).not.toContain('passwordHash');
    expect(JSON.stringify(body)).not.toContain('email');
  });

  it('marks every unread notification read for the session user only', async () => {
    const response = await POST(postRequest({ all: true }));
    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { recipientId: 'user-a', type: { not: 'MESSAGE' }, isRead: false },
      data: { isRead: true },
    });
    expect((await response.json()).unreadCount).toBe(1);
  });

  it('marks a single notification read, scoped to the session user', async () => {
    const response = await POST(postRequest({ id: 'n1' }));
    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: 'n1', recipientId: 'user-a' },
      data: { isRead: true },
    });
  });

  it('rejects payloads that specify neither an id nor all', async () => {
    expect((await POST(postRequest({}))).status).toBe(400);
    expect((await POST(postRequest({ extra: true }))).status).toBe(400);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
