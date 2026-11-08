import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), conversationFindUnique: vi.fn(), friendshipFindUnique: vi.fn(), messageFindMany: vi.fn(), messageUpdateMany: vi.fn(), transaction: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: {
  directConversation: { findUnique: mocks.conversationFindUnique },
  friendship: { findUnique: mocks.friendshipFindUnique },
  directMessage: { findMany: mocks.messageFindMany, updateMany: mocks.messageUpdateMany },
  $transaction: mocks.transaction,
} }));

import { GET, POST } from './route';

const context = { params: Promise.resolve({ id: 'conversation-a' }) };
const conversation = { id: 'conversation-a', participantOneId: 'user-a', participantTwoId: 'user-b' };
const messageRequest = (body: unknown) => new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('direct messages API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-a' });
    mocks.conversationFindUnique.mockResolvedValue(conversation);
    mocks.friendshipFindUnique.mockResolvedValue({ status: 'ACCEPTED' });
    mocks.messageFindMany.mockResolvedValue([]);
    mocks.messageUpdateMany.mockResolvedValue({ count: 0 });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({ directMessage: { create: vi.fn().mockResolvedValue({ id: 'message-a', content: 'hello', senderId: 'user-a' }) }, directConversation: { update: vi.fn() } }));
  });
  it('reads messages only for an accepted conversation participant', async () => {
    expect((await GET(new Request('http://localhost'), context)).status).toBe(200);
    expect(mocks.messageUpdateMany).toHaveBeenCalledWith({ where: { conversationId: 'conversation-a', senderId: { not: 'user-a' }, isRead: false }, data: { isRead: true } });
    expect(mocks.messageFindMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }));
    mocks.friendshipFindUnique.mockResolvedValue({ status: 'PENDING' });
    expect((await GET(new Request('http://localhost'), context)).status).toBe(403);
  });
  it('sends trimmed messages with session sender and rejects invalid or unauthorised requests', async () => {
    const response = await POST(messageRequest({ content: ' hello ' }), context);
    expect(response.status).toBe(201);
    mocks.friendshipFindUnique.mockResolvedValue({ status: 'PENDING' });
    expect((await POST(messageRequest({ content: 'hello' }), context)).status).toBe(403);
    mocks.friendshipFindUnique.mockResolvedValue({ status: 'ACCEPTED' });
    expect((await POST(messageRequest({ content: '' }), context)).status).toBe(400);
  });
});
