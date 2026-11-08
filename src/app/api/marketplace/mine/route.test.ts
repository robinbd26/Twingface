import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), findMany: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { marketplaceListing: { findMany: mocks.findMany } } }));
import { GET } from './route';

describe('my marketplace listings API', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCurrentUser.mockResolvedValue({ id: 'seller-a' }); });

  it('requires a session and returns only the current seller rows including sold out', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);
    mocks.findMany.mockResolvedValue([]);
    expect((await GET()).status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { sellerId: 'seller-a' } }));
  });
});
