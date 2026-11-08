import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listingFindUnique: vi.fn(),
  confirmedFindMany: vi.fn(),
  blockFindMany: vi.fn(),
  blockFindUnique: vi.fn(),
  blockCreate: vi.fn(),
  blockDelete: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({
  prisma: {
    rentalListing: { findUnique: mocks.listingFindUnique },
    booking: { findMany: mocks.confirmedFindMany },
    rentalAvailabilityBlock: {
      findMany: mocks.blockFindMany,
      findUnique: mocks.blockFindUnique,
      create: mocks.blockCreate,
      delete: mocks.blockDelete,
    },
  },
}));

import { GET, POST } from './route';
import { DELETE } from './[blockId]/route';

const owner = { id: 'providera', name: 'Owner', username: 'owner', email: null, profileImage: null };
const listing = { id: 'listinga', title: 'Camera kit', provider: { id: 'providera', userId: 'providera' } };
const blockRow = {
  id: 'blocka',
  startAt: new Date('2026-11-09T18:00:00.000Z'),
  endAt: new Date('2026-11-11T18:00:00.000Z'),
  reason: 'Maintenance',
  createdAt: new Date('2026-10-24T06:00:00.000Z'),
};
const context = { params: Promise.resolve({ id: 'listinga' }) };

function postRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/for-rent/listinga/blocks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('availability block API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(owner);
    mocks.listingFindUnique.mockResolvedValue(listing);
    mocks.confirmedFindMany.mockResolvedValue([]);
    mocks.blockFindMany.mockResolvedValue([]);
    mocks.blockCreate.mockResolvedValue(blockRow);
    mocks.blockDelete.mockResolvedValue({ id: 'blocka' });
  });

  it('lists blocks only for the listing owner', async () => {
    mocks.blockFindMany.mockResolvedValue([blockRow]);

    const response = await GET(new Request('http://localhost'), context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.blocks).toEqual([
      {
        id: 'blocka',
        startAt: '2026-11-09T18:00:00.000Z',
        endAt: '2026-11-11T18:00:00.000Z',
        reason: 'Maintenance',
        createdAt: '2026-10-24T06:00:00.000Z',
      },
    ]);

    mocks.getCurrentUser.mockResolvedValue({ ...owner, id: 'stranger' });
    expect((await GET(new Request('http://localhost'), context)).status).toBe(403);
  });

  it('blocks dates for the owner', async () => {
    const response = await POST(postRequest({ startDate: '2026-11-10', endDate: '2026-11-12', reason: 'Maintenance' }), context);

    expect(response.status).toBe(201);
    expect(mocks.blockCreate).toHaveBeenCalledWith({
      data: {
        listingId: 'listinga',
        providerId: 'providera',
        startAt: new Date('2026-11-09T18:00:00.000Z'),
        endAt: new Date('2026-11-11T18:00:00.000Z'),
        reason: 'Maintenance',
      },
      select: expect.any(Object),
    });
  });

  it('refuses to block dates another confirmed booking already holds', async () => {
    mocks.confirmedFindMany.mockResolvedValue([{ startAt: blockRow.startAt, endAt: blockRow.endAt }]);

    const response = await POST(postRequest({ startDate: '2026-11-10', endDate: '2026-11-12' }), context);

    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/confirmed booking already covers/i);
    expect(mocks.blockCreate).not.toHaveBeenCalled();
  });

  it('refuses overlapping blocks and invalid windows', async () => {
    mocks.blockFindMany.mockResolvedValue([{ startAt: blockRow.startAt, endAt: blockRow.endAt }]);
    const overlap = await POST(postRequest({ startDate: '2026-11-10', endDate: '2026-11-12' }), context);
    expect(overlap.status).toBe(409);
    expect((await overlap.json()).error).toMatch(/already blocked/i);

    const reversed = await POST(postRequest({ startDate: '2026-11-12', endDate: '2026-11-10' }), context);
    expect(reversed.status).toBe(400);
    expect(mocks.blockCreate).not.toHaveBeenCalled();
  });

  it('keeps non-owners out of blocking', async () => {
    mocks.getCurrentUser.mockResolvedValue({ ...owner, id: 'stranger' });

    const response = await POST(postRequest({ startDate: '2026-11-10', endDate: '2026-11-12' }), context);

    expect(response.status).toBe(403);
    expect(mocks.blockCreate).not.toHaveBeenCalled();
  });

  it('deletes only a block that belongs to the owner listing', async () => {
    const deleteContext = { params: Promise.resolve({ id: 'listinga', blockId: 'blocka' }) };
    mocks.blockFindUnique.mockResolvedValue({
      id: 'blocka',
      listingId: 'listinga',
      listing: { provider: { userId: 'providera' } },
    });

    const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), deleteContext);
    expect(response.status).toBe(204);
    expect(mocks.blockDelete).toHaveBeenCalledWith({ where: { id: 'blocka' } });

    mocks.blockFindUnique.mockResolvedValue({
      id: 'blocka',
      listingId: 'listingb',
      listing: { provider: { userId: 'providera' } },
    });
    expect((await DELETE(new Request('http://localhost', { method: 'DELETE' }), deleteContext)).status).toBe(404);

    mocks.blockFindUnique.mockResolvedValue({
      id: 'blocka',
      listingId: 'listinga',
      listing: { provider: { userId: 'someoneelse' } },
    });
    expect((await DELETE(new Request('http://localhost', { method: 'DELETE' }), deleteContext)).status).toBe(403);
    expect(mocks.blockDelete).toHaveBeenCalledTimes(1);
  });
});
