import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: { marketplaceListing: { findMany: mocks.findMany } } }));

import { GET } from './route';
import { MEDIA_WORLD_SERVICE_CATEGORIES } from '@/lib/mediaworld';

describe('mediaworld directory API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
  });

  it('serves the directory to anonymous visitors without leaking contact fields', async () => {
    const response = await GET(new Request('http://localhost/api/mediaworld'));

    expect(response.status).toBe(200);
    expect(JSON.stringify(await response.json())).not.toMatch(/email|phone|passwordHash|publicId/i);
  });

  it('searches available listings with bounded safe filters', async () => {
    const response = await GET(new Request('http://localhost/api/mediaworld?limit=99&q=%20camera%20&category=CAMERA_HOUSE'));
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'AVAILABLE',
          category: { in: ['CAMERA_HOUSE'] },
        }),
      }),
    );
    expect(JSON.stringify(await response.json())).not.toMatch(/email|phone|passwordHash|publicId/i);
  });

  it('limits unfiltered directory results to MediaWorld service categories', async () => {
    const response = await GET(new Request('http://localhost/api/mediaworld'));

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'AVAILABLE',
          category: { in: [...MEDIA_WORLD_SERVICE_CATEGORIES] },
        }),
      }),
    );
  });

  it('rejects general marketplace categories instead of returning marketplace products', async () => {
    const response = await GET(new Request('http://localhost/api/mediaworld?category=ELECTRONICS'));

    expect(response.status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('rejects a district that does not belong to the division (Rajshahi -> Bogura is fine)', async () => {
    const ok = await GET(new Request('http://localhost/api/mediaworld?division=Rajshahi&district=Bogura'));
    expect(ok.status).toBe(200);
    const bad = await GET(new Request('http://localhost/api/mediaworld?division=Dhaka&district=Bogura'));
    expect(bad.status).toBe(400);
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
  });
});
