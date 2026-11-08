import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  userFindUnique: vi.fn(),
  conversationUpsert: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: {
  user: { findUnique: mocks.userFindUnique },
  directConversation: { upsert: mocks.conversationUpsert },
} }));

import { POST } from './route';

const viewer = { id: 'user-b', name: 'Visitor', username: 'visitor' };
const context = { params: Promise.resolve({ username: 'Amina' }) };

describe('Media World profile message API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.userFindUnique.mockResolvedValue({ id: 'user-a', accountType: 'PROFESSIONAL' });
    mocks.conversationUpsert.mockResolvedValue({ id: 'conversation-a' });
  });

  it('opens a Media World enabled conversation without a friendship', async () => {
    const response = await POST(new Request('http://localhost/api/mediaworld/talent/Amina/message', { method: 'POST' }), context);
    expect(response.status).toBe(200);
    expect(mocks.userFindUnique).toHaveBeenCalledWith({ where: { username: 'amina' }, select: { id: true, accountType: true } });
    expect(mocks.conversationUpsert).toHaveBeenCalledWith({
      where: { pairKey: 'user-a:user-b' },
      create: {
        pairKey: 'user-a:user-b',
        participantOneId: 'user-a',
        participantTwoId: 'user-b',
        mediaWorldMessagingEnabled: true,
      },
      update: { mediaWorldMessagingEnabled: true },
      select: { id: true },
    });
    expect(await response.json()).toEqual({ conversationId: 'conversation-a' });
  });

  it('requires a session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await POST(new Request('http://localhost', { method: 'POST' }), context)).status).toBe(401);
    expect(mocks.conversationUpsert).not.toHaveBeenCalled();
  });

  it.each([
    ['missing profile', null, 404],
    ['plain Twingface account', { id: 'user-a', accountType: null }, 404],
    ['own profile', { id: 'user-b', accountType: 'PROFESSIONAL' }, 400],
  ])('rejects %s', async (_label, target, expectedStatus) => {
    mocks.userFindUnique.mockResolvedValue(target);
    expect((await POST(new Request('http://localhost', { method: 'POST' }), context)).status).toBe(expectedStatus);
    expect(mocks.conversationUpsert).not.toHaveBeenCalled();
  });
});
