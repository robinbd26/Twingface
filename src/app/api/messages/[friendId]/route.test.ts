import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), friendshipFindUnique: vi.fn(), userFindUnique: vi.fn(), conversationFindUnique: vi.fn(), directMessageFindMany: vi.fn(), directMessageUpdateMany: vi.fn() }));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({
  prisma: {
    friendship: { findUnique: mocks.friendshipFindUnique },
    user: { findUnique: mocks.userFindUnique },
    directConversation: { findUnique: mocks.conversationFindUnique },
    directMessage: { findMany: mocks.directMessageFindMany, updateMany: mocks.directMessageUpdateMany },
  },
}));

import { GET } from './route';

const viewer = { id: 'user-a', name: 'A', username: 'alice', email: 'alice@example.com', profileImage: null };
const friend = { id: 'user-b', name: 'Bob', username: 'bob', profileImage: null };

function context(id: string) { return { params: Promise.resolve({ friendId: id }) }; }
function request(url = 'http://localhost/api/messages/user-b') { return new Request(url); }

describe('message history API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.friendshipFindUnique.mockResolvedValue({ status: 'ACCEPTED' });
    mocks.userFindUnique.mockResolvedValue(friend);
    mocks.conversationFindUnique.mockResolvedValue({ id: 'conv-1' });
    mocks.directMessageFindMany.mockResolvedValue([
      { id: 'm1', content: 'Hi', attachments: [], isRead: true, createdAt: new Date(), senderId: 'user-b', sender: friend },
    ]);
    mocks.directMessageUpdateMany.mockResolvedValue({ count: 0 });
  });

  it('requires a session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET(request(), context('user-b'))).status).toBe(401);
  });

  it('rejects messaging yourself', async () => {
    expect((await GET(request('http://localhost/api/messages/user-a'), context('user-a'))).status).toBe(400);
  });

  it('rejects messaging a non-friend with 403', async () => {
    mocks.friendshipFindUnique.mockResolvedValue(null);
    expect((await GET(request(), context('user-b'))).status).toBe(403);
    expect(mocks.directMessageFindMany).not.toHaveBeenCalled();
  });

  it('returns the conversation history for accepted friends', async () => {
    const response = await GET(request(), context('user-b'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.friend).toMatchObject({ id: 'user-b' });
    expect(body.conversationId).toBe('conv-1');
    expect(body.messages).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain('email');
    expect(mocks.directMessageFindMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 31 }));
    expect(mocks.directMessageUpdateMany).toHaveBeenCalledWith({ where: { conversationId: 'conv-1', senderId: { not: 'user-a' }, isRead: false }, data: { isRead: true } });
  });

  it('returns an empty thread when no conversation exists yet', async () => {
    mocks.conversationFindUnique.mockResolvedValue(null);
    const body = await (await GET(request(), context('user-b'))).json();
    expect(body.conversationId).toBeNull();
    expect(body.messages).toEqual([]);
    expect(mocks.directMessageFindMany).not.toHaveBeenCalled();
  });

  it('returns only messages newer than the since cursor (polling fallback)', async () => {
    mocks.directMessageFindMany.mockResolvedValue([
      { id: 'm2', content: 'newer', attachments: [], isRead: false, createdAt: new Date('2024-02-01T00:00:00.000Z'), senderId: 'user-a', sender: viewer },
    ]);
    const response = await GET(request('http://localhost/api/messages/user-b?since=2024-01-01T00:00:00.000Z'), context('user-b'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].id).toBe('m2');
    expect(mocks.directMessageFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { conversationId: 'conv-1', createdAt: { gt: new Date('2024-01-01T00:00:00.000Z') } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 30,
    }));
  });

  it('returns no messages when the since cursor has no newer rows', async () => {
    mocks.directMessageFindMany.mockResolvedValue([]);
    const body = await (await GET(request('http://localhost/api/messages/user-b?since=2024-01-01T00:00:00.000Z'), context('user-b'))).json();
    expect(body.messages).toEqual([]);
  });

  it('rejects an invalid since timestamp with 400', async () => {
    const response = await GET(request('http://localhost/api/messages/user-b?since=not-a-date'), context('user-b'));
    expect(response.status).toBe(400);
    expect(mocks.directMessageFindMany).not.toHaveBeenCalled();
  });
});
