import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listingFindUnique: vi.fn(),
  bookingFindFirst: vi.fn(),
  bookingFindMany: vi.fn(),
  bookingCreate: vi.fn(),
  blockFindFirst: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({
  prisma: {
    rentalListing: { findUnique: mocks.listingFindUnique },
    booking: { findFirst: mocks.bookingFindFirst, findMany: mocks.bookingFindMany, create: mocks.bookingCreate },
    rentalAvailabilityBlock: { findFirst: mocks.blockFindFirst },
  },
}));

import { POST } from './route';

const renter = { id: 'rentera', name: 'Renter', username: 'renter', email: null, profileImage: null };

const listing = {
  id: 'listinga',
  title: 'Camera kit',
  pricePaisa: 500000,
  priceUnit: 'PER_DAY',
  priceCustom: null,
  availability: 'AVAILABLE',
  isActive: true,
  provider: { id: 'providera', userId: 'providera', ownerName: 'Provider', businessName: null },
};

const pendingRow = {
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
  history: [
    {
      id: 'history1',
      fromStatus: null,
      toStatus: 'PENDING',
      note: 'Booking requested',
      createdAt: new Date('2026-10-24T06:00:00.000Z'),
      actor: { id: 'rentera', name: 'Renter' },
    },
  ],
};

const context = { params: Promise.resolve({ id: 'listinga' }) };

function postRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/for-rent/listinga/bookings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('booking request API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(renter);
    mocks.listingFindUnique.mockResolvedValue(listing);
    mocks.bookingFindFirst.mockResolvedValue(null);
    mocks.bookingFindMany.mockResolvedValue([]);
    mocks.blockFindFirst.mockResolvedValue(null);
    mocks.bookingCreate.mockResolvedValue(pendingRow);
  });

  it('requires authentication', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await POST(postRequest({ startDate: '2026-11-01', endDate: '2026-11-04' }), context)).status).toBe(401);
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
  });

  it('rejects malformed listing ids before querying', async () => {
    const response = await POST(postRequest({ startDate: '2026-11-01', endDate: '2026-11-04' }), {
      params: Promise.resolve({ id: '../evil' }),
    });
    expect(response.status).toBe(404);
    expect(mocks.listingFindUnique).not.toHaveBeenCalled();
  });

  it('stops a provider from booking their own listing', async () => {
    mocks.getCurrentUser.mockResolvedValue({ ...renter, id: 'providera' });
    const response = await POST(postRequest({ startDate: '2026-11-01', endDate: '2026-11-04' }), context);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/your own listing/i);
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
  });

  it('rejects impossible dates and missing hourly times', async () => {
    expect((await POST(postRequest({ startDate: '2026-02-31', endDate: '2026-03-02' }), context)).status).toBe(400);

    mocks.listingFindUnique.mockResolvedValue({ ...listing, priceUnit: 'PER_HOUR' });
    const hourly = await POST(postRequest({ startDate: '2026-11-01', endDate: '2026-11-01' }), context);
    expect(hourly.status).toBe(400);
    expect((await hourly.json()).error).toMatch(/start and end time/i);
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
  });

  it('refuses a listing that is hidden or not available', async () => {
    mocks.listingFindUnique.mockResolvedValue({ ...listing, availability: 'PAUSED' });
    const response = await POST(postRequest({ startDate: '2026-11-01', endDate: '2026-11-04' }), context);
    expect(response.status).toBe(409);
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
  });

  it('creates a pending request with a server-side quote and an honest notice', async () => {
    const response = await POST(postRequest({ startDate: '2026-11-01', endDate: '2026-11-04', note: 'Need a wide lens.' }), context);
    const body = await response.json();
    const data = mocks.bookingCreate.mock.calls[0][0].data;

    expect(response.status).toBe(201);
    expect(data).toMatchObject({
      listingId: 'listinga',
      renterId: 'rentera',
      priceUnit: 'PER_DAY',
      unitPricePaisa: 500000,
      totalPaisa: 1500000,
      note: 'Need a wide lens.',
      history: { create: expect.objectContaining({ toStatus: 'PENDING', actorId: 'rentera' }) },
    });
    expect(data.status).toBeUndefined();
    expect(data.startAt).toEqual(new Date('2026-10-31T18:00:00.000Z'));
    expect(data.endAt).toEqual(new Date('2026-11-03T18:00:00.000Z'));
    expect(body.booking.status).toBe('PENDING');
    expect(body.notice).toMatch(/not confirmed yet/i);
    expect(body.quote).toEqual({ totalPaisa: 1500000, units: 3, unit: 'PER_DAY', unitPricePaisa: 500000, negotiable: false });
  });

  it('refuses an identical pending duplicate', async () => {
    mocks.bookingFindFirst.mockResolvedValueOnce({ id: 'existing' });
    const response = await POST(postRequest({ startDate: '2026-11-01', endDate: '2026-11-04' }), context);
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/already requested/i);
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
  });

  it('refuses a range that overlaps a confirmed booking', async () => {
    mocks.bookingFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ startAt: new Date('2026-11-02T18:00:00.000Z'), endAt: new Date('2026-11-05T18:00:00.000Z') });

    const response = await POST(postRequest({ startDate: '2026-11-01', endDate: '2026-11-04' }), context);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toMatch(/already confirmed/i);
    expect(body.conflict).toEqual({
      kind: 'booking',
      startAt: '2026-11-02T18:00:00.000Z',
      endAt: '2026-11-05T18:00:00.000Z',
    });
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
  });

  it('reports competing pending requests without blocking the new one', async () => {
    mocks.bookingFindMany.mockResolvedValue([
      { startAt: new Date('2026-11-01T18:00:00.000Z'), endAt: new Date('2026-11-02T18:00:00.000Z') },
      { startAt: new Date('2026-11-02T18:00:00.000Z'), endAt: new Date('2026-11-03T18:00:00.000Z') },
    ]);

    const response = await POST(postRequest({ startDate: '2026-11-01', endDate: '2026-11-04' }), context);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.competingRequests).toBe(2);
  });
});
