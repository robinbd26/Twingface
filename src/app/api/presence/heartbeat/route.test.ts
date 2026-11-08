import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), upsert: vi.fn() }));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { userPresence: { upsert: mocks.upsert } } }));

import { POST } from './route';

const viewer = { id: 'user-a', name: 'A', username: 'alice', email: 'alice@example.com', profileImage: null };

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/presence/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('presence heartbeat API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.upsert.mockResolvedValue({ userId: 'user-a', isOnline: true, lastActiveAt: new Date() });
  });

  it('requires a session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await POST(jsonRequest({ isOnline: true }))).status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('marks the user online and records the last active time', async () => {
    const response = await POST(jsonRequest({ isOnline: true }));
    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-a' },
      create: expect.objectContaining({ userId: 'user-a', isOnline: true }),
      update: expect.objectContaining({ isOnline: true }),
    }));
    const body = await response.json();
    expect(body.presence.userId).toBe('user-a');
  });

  it('flips the user offline on disconnect', async () => {
    mocks.upsert.mockResolvedValue({ userId: 'user-a', isOnline: false, lastActiveAt: new Date() });
    await POST(jsonRequest({ isOnline: false }));
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ isOnline: false }),
    }));
  });

  it('defaults to online when no body is provided', async () => {
    const response = await POST(jsonRequest(''));
    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ isOnline: true }),
    }));
  });

  it('rejects unexpected fields', async () => {
    expect((await POST(jsonRequest({ isOnline: true, bogus: 1 }))).status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
