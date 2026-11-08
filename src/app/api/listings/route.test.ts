import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listingCreate: vi.fn(),
  listingFindMany: vi.fn(),
  listingFindUnique: vi.fn(),
  listingUpdate: vi.fn(),
  listingDelete: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({
  prisma: {
    listing: {
      create: mocks.listingCreate,
      findMany: mocks.listingFindMany,
      findUnique: mocks.listingFindUnique,
      update: mocks.listingUpdate,
      delete: mocks.listingDelete,
    },
  },
}));

import { GET, POST } from './route';
import { DELETE, PATCH } from './[id]/route';

const viewer = { id: 'user-a', name: 'A', username: 'alice', email: 'alice@example.com', profileImage: null };
const listing = { id: 'listing-1', title: 'Bike', price: 50000, sellerId: 'user-a' };

const request = (body: unknown) => new Request('http://localhost/api/listings', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

describe('listings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
  });

  it('requires a session for write operations', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const body = { title: 'Bike for sale', price: 50000, category: 'Vehicles', condition: 'USED_GOOD' };
    expect((await POST(request(body))).status).toBe(401);
    expect((await PATCH(request({ status: 'SOLD' }), { params: Promise.resolve({ id: 'listing-1' }) })).status).toBe(401);
    expect((await DELETE(request(null), { params: Promise.resolve({ id: 'listing-1' }) })).status).toBe(401);
  });

  it('rejects invalid payloads', async () => {
    expect((await POST(request({ title: 'x', price: -5, category: '', condition: 'NEW' }))).status).toBe(400);
    expect(mocks.listingCreate).not.toHaveBeenCalled();
  });

  it('creates a listing as the seller', async () => {
    mocks.listingCreate.mockResolvedValue(listing);
    const response = await POST(request({ title: 'Bike for sale', price: 50000, category: 'Vehicles', condition: 'USED_GOOD', location: 'Dhaka' }));
    expect(response.status).toBe(201);
    expect(mocks.listingCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ title: 'Bike for sale', price: 50000, sellerId: 'user-a' }),
    }));
  });

  it('lists available items with search and category filters', async () => {
    mocks.listingFindMany.mockResolvedValue([listing]);
    const url = 'http://localhost/api/listings?query=bike&category=Vehicles&limit=10';
    const response = await GET(new Request(url));
    expect(response.status).toBe(200);
    expect(mocks.listingFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'AVAILABLE', category: 'Vehicles' }),
    }));
  });

  it('only the seller can mark sold or delete', async () => {
    mocks.listingFindUnique.mockResolvedValue({ sellerId: 'user-b' });
    expect((await PATCH(request({ status: 'SOLD' }), { params: Promise.resolve({ id: 'listing-1' }) })).status).toBe(403);
    expect((await DELETE(request(null), { params: Promise.resolve({ id: 'listing-1' }) })).status).toBe(403);
    expect(mocks.listingUpdate).not.toHaveBeenCalled();
    expect(mocks.listingDelete).not.toHaveBeenCalled();
  });

  it('seller can mark sold and delete', async () => {
    mocks.listingFindUnique.mockResolvedValue({ sellerId: 'user-a' });
    mocks.listingUpdate.mockResolvedValue({ ...listing, status: 'SOLD' });
    expect((await PATCH(request({ status: 'SOLD' }), { params: Promise.resolve({ id: 'listing-1' }) })).status).toBe(200);
    expect((await DELETE(request(null), { params: Promise.resolve({ id: 'listing-1' }) })).status).toBe(200);
    expect(mocks.listingDelete).toHaveBeenCalledWith({ where: { id: 'listing-1' } });
  });
});
