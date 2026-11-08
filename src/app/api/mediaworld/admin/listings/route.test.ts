import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { rentalListing: { findMany: mocks.findMany } } }));

import { GET } from './route';

const admin = { id: 'admin1', name: 'Admin', username: 'root', email: null, profileImage: null, role: 'SUPER_ADMIN' };

function get(query: string) {
  return GET(new Request(`http://localhost/api/mediaworld/admin/listings${query}`));
}

const listing = {
  id: 'listing1',
  title: 'Sony FX3 cinema camera',
  description: 'Full frame cinema body',
  pricePaisa: 500000,
  priceUnit: 'PER_DAY',
  priceCustom: null,
  location: 'Dhanmondi',
  division: 'Dhaka',
  district: 'Dhaka',
  availability: 'AVAILABLE',
  isActive: true,
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-02T00:00:00.000Z'),
  providerId: 'provider1',
  category: { id: 'cat1', code: 'CAMERA', nameEn: 'Camera', nameBn: 'ক্যামেরা' },
  subcategory: null,
  provider: { id: 'provider1', businessName: 'Lens House', ownerName: 'Rafiq', location: 'Dhaka', logoUrl: null },
  photos: [],
  _count: { inquiries: 3, reports: 1 },
};

describe('GET /api/mediaworld/admin/listings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(admin);
    mocks.findMany.mockResolvedValue([listing]);
  });

  it('requires a super admin session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await get('?view=ALL')).status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();

    mocks.getCurrentUser.mockResolvedValue({ ...admin, role: 'USER' });
    expect((await get('?view=ALL')).status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('hides and shows listings across every provider, not just the caller', async () => {
    const response = await get('?view=HIDDEN');

    expect(response.status).toBe(200);
    const where = mocks.findMany.mock.calls[0][0].where;
    expect(where).toEqual(expect.objectContaining({ isActive: false }));
    expect(JSON.stringify(where)).not.toMatch(/userId|providerId/);
  });

  it('keeps the ACTIVE view to published listings and supports availability plus search', async () => {
    await get('?view=ACTIVE&availability=TEMPORARILY_UNAVAILABLE&q=camera');

    const where = mocks.findMany.mock.calls[0][0].where;
    expect(where).toEqual(
      expect.objectContaining({
        isActive: true,
        availability: 'TEMPORARILY_UNAVAILABLE',
        OR: expect.arrayContaining([expect.objectContaining({ title: expect.objectContaining({ contains: 'camera' }) })]),
      }),
    );
  });

  it('returns the next cursor when a full page came back', async () => {
    mocks.findMany.mockResolvedValue(Array.from({ length: 5 }, (_value, index) => ({ ...listing, id: `listing${index}` })));

    const response = await get('?view=ALL&limit=4');
    const body = await response.json();

    expect(body.listings).toHaveLength(4);
    expect(body.nextCursor).toBe('listing3');
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
  });

  it('pages from a cursor without repeating the last row', async () => {
    await get('?cursor=listing9&limit=10');

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ cursor: { id: 'listing9' }, skip: 1 }));
  });

  it('rejects an unknown moderation view', async () => {
    const response = await get('?view=DELETED');

    expect(response.status).toBe(400);
    expect((await response.json()).fields.view).toHaveLength(1);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
