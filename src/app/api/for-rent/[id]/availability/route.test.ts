import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listingFindUnique: vi.fn(),
  bookingFindMany: vi.fn(),
  bookingFindFirst: vi.fn(),
  blockFindMany: vi.fn(),
  blockFindFirst: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({
  prisma: {
    rentalListing: { findUnique: mocks.listingFindUnique },
    booking: { findMany: mocks.bookingFindMany, findFirst: mocks.bookingFindFirst },
    rentalAvailabilityBlock: { findMany: mocks.blockFindMany, findFirst: mocks.blockFindFirst },
  },
}));

import { GET, POST } from './route';

const viewer = { id: 'rentera', name: 'Renter', username: 'renter', email: null, profileImage: null };
const listing = {
  id: 'listinga',
  pricePaisa: 500000,
  priceUnit: 'PER_DAY',
  priceCustom: null,
  availability: 'AVAILABLE',
  isActive: true,
  provider: { userId: 'providera' },
};
const context = { params: Promise.resolve({ id: 'listinga' }) };

const confirmed = { startAt: new Date('2026-11-04T18:00:00.000Z'), endAt: new Date('2026-11-07T18:00:00.000Z') };
const pending = { startAt: new Date('2026-11-09T18:00:00.000Z'), endAt: new Date('2026-11-11T18:00:00.000Z') };
const block = { startAt: new Date('2026-11-01T18:00:00.000Z'), endAt: new Date('2026-11-02T18:00:00.000Z') };

function postRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/for-rent/listinga/availability', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('listing availability API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.listingFindUnique.mockResolvedValue(listing);
    mocks.blockFindMany.mockResolvedValue([block]);
    mocks.bookingFindFirst.mockResolvedValue(null);
    mocks.blockFindFirst.mockResolvedValue(null);
    mocks.bookingFindMany.mockImplementation(async ({ where }: { where: { status?: string } }) =>
      where.status === 'CONFIRMED' ? [confirmed] : [pending],
    );
  });

  it('requires authentication', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET(new Request('http://localhost/api/for-rent/listinga/availability'), context)).status).toBe(401);
  });

  it('returns confirmed bookings, blocks and pending requests as separate signals', async () => {
    const response = await GET(
      new Request('http://localhost/api/for-rent/listinga/availability?from=2026-11-01&to=2026-12-01'),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.window).toEqual({ from: '2026-11-01', to: '2026-12-01' });
    expect(body.listing).toMatchObject({ id: 'listinga', priceUnit: 'PER_DAY', isOwner: false });
    expect(body.blocked).toEqual([
      { startAt: '2026-11-01T18:00:00.000Z', endAt: '2026-11-02T18:00:00.000Z', kind: 'block' },
      { startAt: '2026-11-04T18:00:00.000Z', endAt: '2026-11-07T18:00:00.000Z', kind: 'booking' },
    ]);
    expect(body.pending).toEqual([{ startAt: '2026-11-09T18:00:00.000Z', endAt: '2026-11-11T18:00:00.000Z' }]);
  });

  it('rejects an invalid availability window', async () => {
    const response = await GET(
      new Request('http://localhost/api/for-rent/listinga/availability?from=2026-11-10&to=2026-11-01'),
      context,
    );
    expect(response.status).toBe(400);
  });

  it('reports a selection as available while pending requests stay advisory', async () => {
    const response = await POST(postRequest({ startDate: '2026-11-20', endDate: '2026-11-22' }), context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ available: true, competingRequests: 1 });
  });

  it('explains why a blocked selection is not available', async () => {
    mocks.blockFindFirst.mockResolvedValue({
      startAt: new Date('2026-11-19T18:00:00.000Z'),
      endAt: new Date('2026-11-23T18:00:00.000Z'),
    });

    const response = await POST(postRequest({ startDate: '2026-11-20', endDate: '2026-11-22' }), context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.available).toBe(false);
    expect(body.reason).toMatch(/provider blocked/i);
  });

  it('marks a paused listing as unavailable', async () => {
    mocks.listingFindUnique.mockResolvedValue({ ...listing, availability: 'PAUSED' });

    const response = await POST(postRequest({ startDate: '2026-11-20', endDate: '2026-11-22' }), context);
    expect((await response.json()).available).toBe(false);
  });
});
