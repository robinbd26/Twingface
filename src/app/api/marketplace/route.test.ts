import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  transaction: vi.fn(),
  uploadMarketplaceImage: vi.fn(),
  destroyPostImage: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: {
  marketplaceListing: { findMany: mocks.findMany, create: mocks.create },
  $transaction: mocks.transaction,
} }));
vi.mock('@/lib/cloudinary', () => ({
  uploadMarketplaceImage: mocks.uploadMarketplaceImage,
  destroyPostImage: mocks.destroyPostImage,
}));

import { GET, POST } from './route';

const seller = { id: 'seller-a', name: 'Seller', username: 'seller', email: 'seller@example.com', profileImage: null };
const image = (name = 'item.jpg') => new File([new Uint8Array([0xff, 0xd8, 0xff])], name, { type: 'image/jpeg' });

function listingForm(images: File[] = [image()]) {
  const formData = new FormData();
  formData.set('title', 'Vintage camera');
  formData.set('description', 'A fully working camera in excellent condition.');
  formData.set('price', '1250.50');
  formData.set('category', 'ELECTRONICS');
  formData.set('condition', 'USED');
  formData.set('location', 'Dhaka');
  images.forEach((file) => formData.append('images', file));
  return formData;
}

const formRequest = (formData: FormData) => new Request('http://localhost/api/marketplace', { method: 'POST', body: formData });

describe('marketplace collection API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(seller);
    mocks.transaction.mockImplementation(async (callback) => callback({ marketplaceListing: { create: mocks.create } }));
    mocks.uploadMarketplaceImage.mockResolvedValue({ imageUrl: 'https://res.cloudinary.com/demo/image.jpg', imagePublicId: 'marketplace/internal-id' });
  });

  it('requires authentication before browsing or reading upload bytes', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET(new Request('http://localhost/api/marketplace'))).status).toBe(401);
    expect((await POST(formRequest(listingForm()))).status).toBe(401);
    expect(mocks.uploadMarketplaceImage).not.toHaveBeenCalled();
  });

  it('browses only available listings with bounded safe filters', async () => {
    mocks.findMany.mockResolvedValue([]);
    const response = await GET(new Request('http://localhost/api/marketplace?limit=99&category=FASHION&q=  shirt  '));
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'AVAILABLE', category: 'FASHION' }),
      take: 31,
    }));
    expect(JSON.stringify(mocks.findMany.mock.calls[0][0].select)).not.toMatch(/publicId|email|phone|passwordHash/i);
  });

  it('rejects zero or eleven images before Cloudinary runs', async () => {
    expect((await POST(formRequest(listingForm([])))).status).toBe(400);
    expect((await POST(formRequest(listingForm(Array.from({ length: 11 }, (_, index) => image(`${index}.jpg`)))))).status).toBe(400);
    expect(mocks.uploadMarketplaceImage).not.toHaveBeenCalled();
  });

  it('creates an ordered listing under the authenticated seller identity', async () => {
    mocks.create.mockResolvedValue({ id: 'listing-a', sellerId: seller.id, images: [{ url: 'https://res.cloudinary.com/demo/image.jpg', position: 0 }] });
    const response = await POST(formRequest(listingForm()));
    expect(response.status).toBe(201);
    expect(mocks.uploadMarketplaceImage).toHaveBeenCalledWith(expect.objectContaining({ sellerId: seller.id, mimeType: 'image/jpeg' }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sellerId: seller.id, pricePaisa: 125050, images: { create: [{ url: 'https://res.cloudinary.com/demo/image.jpg', publicId: 'marketplace/internal-id', position: 0 }] } }) }));
  });

  it('cleans every completed upload exactly once when persistence fails without exposing provider details', async () => {
    mocks.uploadMarketplaceImage
      .mockResolvedValueOnce({ imageUrl: 'https://res.cloudinary.com/demo/one.jpg', imagePublicId: 'internal-one' })
      .mockResolvedValueOnce({ imageUrl: 'https://res.cloudinary.com/demo/two.jpg', imagePublicId: 'internal-two' });
    mocks.create.mockRejectedValue(new Error('provider detail must stay private'));
    const response = await POST(formRequest(listingForm([image('one.jpg'), image('two.jpg')])));
    expect(response.status).toBe(500);
    expect(mocks.destroyPostImage).toHaveBeenCalledTimes(2);
    expect(await response.text()).not.toContain('provider detail');
  });
});
