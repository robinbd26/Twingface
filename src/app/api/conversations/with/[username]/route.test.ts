import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), userFindUnique: vi.fn(), friendshipFindUnique: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: mocks.userFindUnique }, friendship: { findUnique: mocks.friendshipFindUnique }, directConversation: { findUnique: mocks.findUnique, upsert: mocks.upsert } } }));

import { POST } from './route';

const context = { params: Promise.resolve({ username: 'bob' }) };
describe('open direct conversation API', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.getCurrentUser.mockResolvedValue({ id: 'user-a' }); mocks.userFindUnique.mockResolvedValue({ id: 'user-b', username: 'bob' }); mocks.friendshipFindUnique.mockResolvedValue({ status: 'ACCEPTED' }); mocks.findUnique.mockResolvedValue(null); mocks.upsert.mockResolvedValue({ id: 'conversation-a', pairKey: 'user-a:user-b' });
  });
  it('opens a canonical conversation only for accepted friends', async () => {
    const response = await POST(new Request('http://localhost'), context);
    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { pairKey: 'user-a:user-b' } }));
    mocks.friendshipFindUnique.mockResolvedValue({ status: 'PENDING' });
    expect((await POST(new Request('http://localhost'), context)).status).toBe(403);
  });
  it('rejects unauthenticated, unknown, and self conversations', async () => {
    mocks.getCurrentUser.mockResolvedValue(null); expect((await POST(new Request('http://localhost'), context)).status).toBe(401);
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-a' }); mocks.userFindUnique.mockResolvedValue(null); expect((await POST(new Request('http://localhost'), context)).status).toBe(404);
    mocks.userFindUnique.mockResolvedValue({ id: 'user-a' }); expect((await POST(new Request('http://localhost'), context)).status).toBe(400);
  });
});
