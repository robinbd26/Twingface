import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), findMany: vi.fn(), friendshipFindMany: vi.fn(), messageCount: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { directConversation: { findMany: mocks.findMany }, friendship: { findMany: mocks.friendshipFindMany }, directMessage: { count: mocks.messageCount } } }));

import { GET } from './route';

describe('conversation list API', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCurrentUser.mockResolvedValue({ id: 'user-a' }); mocks.friendshipFindMany.mockResolvedValue([{ pairKey: 'user-a:user-b' }]); mocks.findMany.mockResolvedValue([]); mocks.messageCount.mockResolvedValue(0); });
  it('requires authentication and lists accepted-friend or Marketplace inquiry conversations in a bounded page', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET(new Request('http://localhost/api/conversations'))).status).toBe(401);
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-a' });
    expect((await GET(new Request('http://localhost/api/conversations?limit=1'))).status).toBe(200);
    expect(mocks.friendshipFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'ACCEPTED' }) }));
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ AND: expect.arrayContaining([expect.objectContaining({ OR: expect.arrayContaining([expect.objectContaining({ pairKey: { in: ['user-a:user-b'] } }), { marketplaceMessagingEnabled: true }]) })]) }), take: 2 }));
  });

  it('includes a recipient-scoped unread message count for the inbox badge', async () => {
    mocks.messageCount.mockResolvedValue(2);
    mocks.findMany.mockResolvedValue([{
      id: 'conversation-a', participantOneId: 'user-a', participantTwoId: 'user-b', lastMessageAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
      participantOne: { id: 'user-a', name: 'Alice', username: 'alice', profileImage: null },
      participantTwo: { id: 'user-b', name: 'Bob', username: 'bob', profileImage: null },
      messages: [], _count: { messages: 2 },
    }]);

    const response = await GET(new Request('http://localhost/api/conversations'));
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({ _count: { select: { messages: { where: { senderId: { not: 'user-a' }, isRead: false } } } } }),
    }));
    expect(mocks.messageCount).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ conversation: expect.objectContaining({ AND: expect.any(Array) }), senderId: { not: 'user-a' }, isRead: false }) }));
    expect((await response.json()).unreadCount).toBe(2);
  });
});
