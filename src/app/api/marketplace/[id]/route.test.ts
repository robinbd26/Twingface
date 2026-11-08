import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
  destroyPostImage: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: {
  marketplaceListing: { findUnique: mocks.findUnique, update: mocks.update, delete: mocks.delete },
  $transaction: mocks.transaction,
} }));
vi.mock('@/lib/cloudinary', () => ({ destroyPostImage: mocks.destroyPostImage, uploadMarketplaceImage: vi.fn() }));

import { DELETE, GET, PATCH } from './route';

const seller = { id: 'seller-a', name: 'Seller', username: 'seller', email: 'seller@example.com', profileImage: null };
const context = { params: Promise.resolve({ id: 'listing-a' }) };
const existing = { sellerId: 'seller-a', images: [{ id: 'image-a', publicId: 'internal-a', url: 'https://res.cloudinary.com/demo/item.jpg', position: 0 }] };

function updateRequest(body: Record<string, string> = { status: 'SOLD_OUT' }) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(body)) formData.set(key, value);
  return new Request('http://localhost/api/marketplace/listing-a', { method: 'PATCH', body: formData });
}

describe('marketplace listing detail API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(seller);
    mocks.findUnique.mockResolvedValue(existing);
    mocks.transaction.mockImplementation(async (callback) => callback({ marketplaceListing: { update: mocks.update, delete: mocks.delete } }));
  });

  it('returns a safe listing detail and reports missing rows', async () => {
    mocks.findUnique.mockResolvedValueOnce({ id: 'listing-a', title: 'Camera', images: [{ url: 'https://res.cloudinary.com/demo/item.jpg' }], seller: { id: 'seller-a', name: 'Seller', username: 'seller', profileImage: null } });
    expect((await GET(new Request('http://localhost'), context)).status).toBe(200);
    expect(JSON.stringify(mocks.findUnique.mock.calls[0][0].select)).not.toMatch(/publicId|email|phone|passwordHash/i);
    mocks.findUnique.mockResolvedValueOnce(null);
    expect((await GET(new Request('http://localhost'), context)).status).toBe(404);
  });

  it('allows only the seller to change listing status', async () => {
    mocks.findUnique.mockResolvedValueOnce({ sellerId: 'seller-b', images: [] });
    expect((await PATCH(updateRequest(), context)).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();

    mocks.findUnique.mockResolvedValueOnce(existing);
    mocks.update.mockResolvedValue({ id: 'listing-a', status: 'SOLD_OUT' });
    expect((await PATCH(updateRequest(), context)).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SOLD_OUT' }) }));
  });

  it('deletes only an owned listing and cleans internal assets best-effort', async () => {
    mocks.findUnique.mockResolvedValueOnce({ sellerId: 'seller-b', images: [] });
    expect((await DELETE(new Request('http://localhost', { method: 'DELETE' }), context)).status).toBe(403);

    mocks.findUnique.mockResolvedValueOnce(existing);
    mocks.delete.mockResolvedValue({ id: 'listing-a' });
    mocks.destroyPostImage.mockRejectedValue(new Error('provider error'));
    expect((await DELETE(new Request('http://localhost', { method: 'DELETE' }), context)).status).toBe(204);
    expect(mocks.destroyPostImage).toHaveBeenCalledWith('internal-a');
  });
});
