import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { booking: { findMany: mocks.findMany } } }));

import { GET } from './route';

const user = { id: 'rentera', name: 'Renter', username: 'renter', email: null, profileImage: null };

const row = {
  id: 'bookinga',
  status: 'PENDING',
  startAt: new Date('2026-10-31T18:00:00.000Z'),
  endAt: new Date('2026-11-03T18:00:00.000Z'),
  priceUnit: 'PER_DAY',
  unitPricePaisa: 500000,
  priceCustom: null,
  totalPaisa: 1500000,
  note: null,
  decisionNote: null,
  decidedAt: null,
  completedAt: null,
  createdAt: new Date('2026-10-24T06:00:00.000Z'),
  listing: {
    id: 'listinga',
    title: 'Camera kit',
    location: 'Dhaka',
    pricePaisa: 500000,
    priceUnit: 'PER_DAY',
    priceCustom: null,
    availability: 'AVAILABLE',
    isActive: true,
    photos: [{ url: 'https://res.cloudinary.com/demo/camera.jpg' }],
    provider: { id: 'providera', ownerName: 'Provider', businessName: null, logoUrl: null },
  },
  renter: { id: 'rentera', name: 'Renter', username: 'renter', profileImage: null },
  history: [],
};

function getRequest(query = '') {
  return new Request(`http://localhost/api/bookings${query}`);
}

describe('booking list API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(user);
    mocks.findMany.mockResolvedValue([row]);
  });

  it('requires authentication', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET(getRequest())).status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('scopes the renter inbox to the signed-in user', async () => {
    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { renterId: 'rentera' }, take: 100 }),
    );
    expect(body.box).toBe('renter');
    expect(body.bookings[0].listing.photos).toEqual(['https://res.cloudinary.com/demo/camera.jpg']);
    expect(body.bookings[0].startAt).toBe('2026-10-31T18:00:00.000Z');
  });

  it('scopes the provider inbox through the listing owner', async () => {
    await GET(getRequest('?box=provider&status=confirmed'));

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { listing: { provider: { userId: 'rentera' } }, status: 'CONFIRMED' },
      }),
    );
  });

  it('ignores an unknown status filter', async () => {
    const response = await GET(getRequest('?status=confirmed-by-me'));
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { renterId: 'rentera' } }));
  });
});
