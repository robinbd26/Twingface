import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  transaction: vi.fn(),
  txFindUnique: vi.fn(),
  txFindFirst: vi.fn(),
  txBlockFindFirst: vi.fn(),
  txUpdate: vi.fn(),
  txQueryRaw: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({
  prisma: {
    booking: { findUnique: mocks.findUnique },
    $transaction: mocks.transaction,
  },
}));

import { PATCH } from './route';

const provider = { id: 'providera', name: 'Provider', username: 'owner', email: null, profileImage: null };
const renter = { id: 'rentera', name: 'Renter', username: 'renter', email: null, profileImage: null };

const pendingBooking = {
  id: 'bookinga',
  listingId: 'listinga',
  renterId: 'rentera',
  status: 'PENDING',
  listing: { isActive: true, availability: 'AVAILABLE', provider: { userId: 'providera' } },
};

const confirmedRow = {
  id: 'bookinga',
  status: 'CONFIRMED',
  startAt: new Date('2026-10-31T18:00:00.000Z'),
  endAt: new Date('2026-11-03T18:00:00.000Z'),
  priceUnit: 'PER_DAY',
  unitPricePaisa: 500000,
  priceCustom: null,
  totalPaisa: 1500000,
  note: null,
  decisionNote: null,
  decidedAt: new Date('2026-10-25T06:00:00.000Z'),
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
      fromStatus: 'PENDING',
      toStatus: 'CONFIRMED',
      note: 'Approved after availability check',
      createdAt: new Date('2026-10-25T06:00:00.000Z'),
      actor: { id: 'providera', name: 'Provider' },
    },
  ],
};

const context = { params: Promise.resolve({ id: 'bookinga' }) };

function patchRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/bookings/bookinga', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function fakeTx() {
  return {
    $queryRaw: mocks.txQueryRaw,
    booking: { findUnique: mocks.txFindUnique, findFirst: mocks.txFindFirst, update: mocks.txUpdate },
    rentalAvailabilityBlock: { findFirst: mocks.txBlockFindFirst },
  };
}

describe('booking action API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(provider);
    mocks.findUnique.mockResolvedValue(pendingBooking);
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(fakeTx()));
    mocks.txFindUnique.mockResolvedValue({
      status: 'PENDING',
      startAt: confirmedRow.startAt,
      endAt: confirmedRow.endAt,
      listingId: 'listinga',
      listing: { isActive: true, availability: 'AVAILABLE' },
    });
    mocks.txFindFirst.mockResolvedValue(null);
    mocks.txBlockFindFirst.mockResolvedValue(null);
    mocks.txUpdate.mockResolvedValue(confirmedRow);
    mocks.txQueryRaw.mockResolvedValue([{ id: 'listinga' }]);
  });

  it('requires authentication and a real participant', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    expect((await PATCH(patchRequest({ action: 'approve' }), context)).status).toBe(401);

    mocks.getCurrentUser.mockResolvedValue({ ...provider, id: 'stranger' });
    const response = await PATCH(patchRequest({ action: 'approve' }), context);
    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('never lets the renter approve their own request', async () => {
    mocks.getCurrentUser.mockResolvedValue(renter);

    const response = await PATCH(patchRequest({ action: 'approve' }), context);

    expect(response.status).toBe(403);
    expect((await response.json()).error).toMatch(/only the listing owner/i);
    expect(mocks.txUpdate).not.toHaveBeenCalled();
  });

  it('confirms only after re-checking availability under a listing lock', async () => {
    const response = await PATCH(patchRequest({ action: 'approve' }), context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.txQueryRaw).toHaveBeenCalledTimes(1);
    expect(mocks.txFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'CONFIRMED', id: { not: 'bookinga' } }) }),
    );
    expect(mocks.txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bookinga' },
        data: expect.objectContaining({
          status: 'CONFIRMED',
          history: { create: expect.objectContaining({ fromStatus: 'PENDING', toStatus: 'CONFIRMED', actorId: 'providera' }) },
        }),
      }),
    );
    expect(body.booking.status).toBe('CONFIRMED');
    expect(body.booking.listing.photos).toEqual(['https://res.cloudinary.com/demo/camera.jpg']);
    expect(body.message).toMatch(/availability check/i);
  });

  it('refuses to confirm a slot another confirmed booking already holds', async () => {
    mocks.txFindFirst.mockResolvedValue({ startAt: confirmedRow.startAt, endAt: confirmedRow.endAt });

    const response = await PATCH(patchRequest({ action: 'approve' }), context);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toMatch(/another booking is already confirmed/i);
    expect(body.conflict.kind).toBe('booking');
    expect(mocks.txUpdate).not.toHaveBeenCalled();
  });

  it('refuses to confirm dates the provider blocked', async () => {
    mocks.txBlockFindFirst.mockResolvedValue({ startAt: confirmedRow.startAt, endAt: confirmedRow.endAt });

    const response = await PATCH(patchRequest({ action: 'approve' }), context);

    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/provider blocked/i);
    expect(mocks.txUpdate).not.toHaveBeenCalled();
  });

  it('refuses to approve when the booking is no longer pending', async () => {
    mocks.txFindUnique.mockResolvedValue({
      status: 'CANCELLED',
      startAt: confirmedRow.startAt,
      endAt: confirmedRow.endAt,
      listingId: 'listinga',
      listing: { isActive: true, availability: 'AVAILABLE' },
    });

    const response = await PATCH(patchRequest({ action: 'approve' }), context);

    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/now cancelled/i);
    expect(mocks.txUpdate).not.toHaveBeenCalled();
  });

  it('refuses to approve when the listing stopped accepting bookings', async () => {
    mocks.txFindUnique.mockResolvedValue({
      status: 'PENDING',
      startAt: confirmedRow.startAt,
      endAt: confirmedRow.endAt,
      listingId: 'listinga',
      listing: { isActive: false, availability: 'PAUSED' },
    });

    const response = await PATCH(patchRequest({ action: 'approve' }), context);

    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/not accepting bookings/i);
    expect(mocks.txUpdate).not.toHaveBeenCalled();
  });

  it('only completes a confirmed booking', async () => {
    const tooEarly = await PATCH(patchRequest({ action: 'complete' }), context);
    expect(tooEarly.status).toBe(409);
    expect(mocks.txUpdate).not.toHaveBeenCalled();

    mocks.findUnique.mockResolvedValue({ ...pendingBooking, status: 'CONFIRMED' });
    mocks.txFindUnique.mockResolvedValue({ status: 'CONFIRMED' });
    mocks.txUpdate.mockResolvedValue({ ...confirmedRow, status: 'COMPLETED', completedAt: new Date('2026-11-05T06:00:00.000Z') });

    const done = await PATCH(patchRequest({ action: 'complete' }), context);
    expect(done.status).toBe(200);
    expect((await done.json()).booking.status).toBe('COMPLETED');
    expect(mocks.txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED', completedAt: expect.any(Date) }) }),
    );
  });

  it('lets the renter cancel a confirmed booking but not a completed one', async () => {
    mocks.getCurrentUser.mockResolvedValue(renter);
    mocks.findUnique.mockResolvedValue({ ...pendingBooking, status: 'CONFIRMED' });
    mocks.txFindUnique.mockResolvedValue({ status: 'CONFIRMED' });
    mocks.txUpdate.mockResolvedValue({ ...confirmedRow, status: 'CANCELLED' });

    const cancelled = await PATCH(patchRequest({ action: 'cancel' }), context);
    expect(cancelled.status).toBe(200);
    expect((await cancelled.json()).booking.status).toBe('CANCELLED');

    mocks.findUnique.mockResolvedValue({ ...pendingBooking, status: 'COMPLETED' });
    const closed = await PATCH(patchRequest({ action: 'cancel' }), context);
    expect(closed.status).toBe(409);
  });

  it('rejects an unknown action without touching the database', async () => {
    const response = await PATCH(patchRequest({ action: 'confirm-now' }), context);

    expect(response.status).toBe(400);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it('lets the provider reject a pending request and records the decision', async () => {
    mocks.txUpdate.mockResolvedValue({ ...confirmedRow, status: 'REJECTED', decidedAt: new Date('2026-10-25T06:00:00.000Z') });

    const response = await PATCH(patchRequest({ action: 'reject', note: 'Already rented that week.' }), context);

    expect(response.status).toBe(200);
    expect(mocks.txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REJECTED',
          decidedAt: expect.any(Date),
          decisionNote: 'Already rented that week.',
        }),
      }),
    );
  });
});
