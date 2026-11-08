import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), adFindMany: vi.fn() }));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { ad: { findMany: mocks.adFindMany } } }));

import { GET } from './route';

const viewer = { id: 'user-a', name: 'A', username: 'alice', email: 'alice@example.com', profileImage: null };
const ad = {
  id: 'ad-1', title: 'Introducing Eleven v4', description: 'Best voices.',
  imageUrl: 'https://cdn.example.com/ad.png', destinationUrl: 'https://www.elevenlabs.io/', createdAt: new Date(),
};

describe('sponsored ads API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.adFindMany.mockResolvedValue([ad]);
  });

  it('requires a session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET(new Request('http://localhost/api/ads/sponsored'))).status).toBe(401);
    expect(mocks.adFindMany).not.toHaveBeenCalled();
  });

  it('returns only active ads with a safe default limit', async () => {
    const response = await GET(new Request('http://localhost/api/ads/sponsored'));
    expect(response.status).toBe(200);
    expect(mocks.adFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isActive: true },
      take: 5,
    }));
    const body = await response.json();
    expect(body.ads).toHaveLength(1);
    expect(body.ads[0]).toMatchObject({ id: 'ad-1', destinationUrl: ad.destinationUrl });
  });

  it('clamps a requested limit to the maximum', async () => {
    await GET(new Request('http://localhost/api/ads/sponsored?limit=999'));
    expect(mocks.adFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
  });
});
