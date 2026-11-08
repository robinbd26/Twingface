import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));

import { POST } from './route';

describe('POST /api/mediaworld/setup/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1', name: 'Farah Rahman' });
  });

  it('requires a session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it('rejects accounts outside the professional flow', async () => {
    mocks.findUnique.mockResolvedValue({ username: 'farah-abc123', accountType: 'BUSINESS', _count: { professionalIdentities: 0 } });

    const response = await POST();

    expect(response.status).toBe(403);
  });

  it('blocks finishing without a profession', async () => {
    mocks.findUnique.mockResolvedValue({ username: 'farah-abc123', accountType: 'PROFESSIONAL', _count: { professionalIdentities: 0 } });

    const response = await POST();

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Add at least one profession before finishing.' });
  });

  it('confirms a complete professional profile', async () => {
    mocks.findUnique.mockResolvedValue({ username: 'farah-abc123', accountType: 'PROFESSIONAL', _count: { professionalIdentities: 2 } });

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ username: 'farah-abc123', identities: 2 });
  });

  it('reports a missing account', async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(404);
  });
});
