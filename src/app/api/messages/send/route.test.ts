import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  userFindUnique: vi.fn(),
  friendshipFindUnique: vi.fn(),
  conversationFindUnique: vi.fn(),
  conversationUpsert: vi.fn(),
  messageCreate: vi.fn(),
  conversationUpdate: vi.fn(),
  notificationCreate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    friendship: { findUnique: mocks.friendshipFindUnique },
    directConversation: { findUnique: mocks.conversationFindUnique },
    notification: { create: mocks.notificationCreate },
    $transaction: async (callback: (tx: unknown) => unknown) => callback({
      directConversation: { upsert: mocks.conversationUpsert, update: mocks.conversationUpdate },
      directMessage: { create: mocks.messageCreate },
    }),
  },
}));

import { POST } from './route';

const viewer = { id: 'user-a', name: 'A', username: 'alice', email: 'alice@example.com', profileImage: null };
const created = { id: 'm1', content: 'Hello', attachments: [], isRead: false, createdAt: new Date(), senderId: 'user-a', sender: { id: 'user-a', name: 'A', username: 'alice', profileImage: null } };

const request = (body: unknown) => new Request('http://localhost/api/messages/send', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

describe('send message API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.userFindUnique.mockResolvedValue({ id: 'user-b' });
    mocks.friendshipFindUnique.mockResolvedValue({ status: 'ACCEPTED' });
    mocks.conversationFindUnique.mockResolvedValue(null);
    mocks.conversationUpsert.mockResolvedValue({ id: 'conv-1' });
    mocks.messageCreate.mockResolvedValue(created);
    mocks.conversationUpdate.mockResolvedValue({});
    mocks.notificationCreate.mockResolvedValue({
      id: 'n1', type: 'MESSAGE', entityId: 'm1', isRead: false,
      createdAt: new Date(), actor: { id: 'user-a', name: 'A', username: 'alice', profileImage: null },
    });
  });

  it('requires a session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await POST(request({ receiverId: 'user-b', messageText: 'Hi' }))).status).toBe(401);
    expect(mocks.messageCreate).not.toHaveBeenCalled();
  });

  it('rejects empty or invalid payloads', async () => {
    expect((await POST(request({ receiverId: 'user-b', messageText: '' }))).status).toBe(400);
    expect((await POST(request({ receiverId: 'user-b' }))).status).toBe(400);
    expect(mocks.messageCreate).not.toHaveBeenCalled();
  });

  it('rejects self messages and unknown users', async () => {
    expect((await POST(request({ receiverId: 'user-a', messageText: 'Hi' }))).status).toBe(400);
    mocks.userFindUnique.mockResolvedValue(null);
    expect((await POST(request({ receiverId: 'user-z', messageText: 'Hi' }))).status).toBe(404);
  });

  it('rejects messaging a non-friend with 403', async () => {
    mocks.friendshipFindUnique.mockResolvedValue(null);
    expect((await POST(request({ receiverId: 'user-b', messageText: 'Hi' }))).status).toBe(403);
    expect(mocks.messageCreate).not.toHaveBeenCalled();
  });

  it('continues a marketplace-enabled conversation for its exact non-friend pair', async () => {
    mocks.friendshipFindUnique.mockResolvedValue(null);
    mocks.conversationFindUnique.mockResolvedValue({ participantOneId: 'user-a', participantTwoId: 'user-b', marketplaceMessagingEnabled: true });
    const response = await POST(request({ receiverId: 'user-b', messageText: 'Still interested' }));
    expect(response.status).toBe(201);
  });

  it('saves and returns the message for accepted friends', async () => {
    const response = await POST(request({ receiverId: 'user-b', messageText: 'Hello' }));
    expect(response.status).toBe(201);
    expect(mocks.messageCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ conversationId: 'conv-1', senderId: 'user-a', content: 'Hello' }),
    }));
    const body = await response.json();
    expect(body.message).toMatchObject({ id: 'm1', senderId: 'user-a' });
    expect(JSON.stringify(body)).not.toContain('passwordHash');
    // Direct messages are delivered through the message stream/inbox, never
    // through the global notifications bell.
    expect(mocks.notificationCreate).not.toHaveBeenCalled();
  });
});
