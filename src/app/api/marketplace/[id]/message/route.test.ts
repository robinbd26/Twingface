import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listingFindUnique: vi.fn(),
  conversationUpsert: vi.fn(),
  messageCreate: vi.fn(),
  conversationUpdate: vi.fn(),
  transaction: vi.fn(),
  publishMessage: vi.fn(),
  notificationCreate: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: {
  marketplaceListing: { findUnique: mocks.listingFindUnique },
  notification: { create: mocks.notificationCreate },
  $transaction: mocks.transaction,
} }));
vi.mock('@/lib/realtime', () => ({ publishMessage: mocks.publishMessage }));
import { POST } from './route';

const buyer = { id: 'buyer-a', name: 'Buyer', username: 'buyer', email: 'buyer@example.com', profileImage: null };
const context = { params: Promise.resolve({ id: 'listing-a' }) };
const request = (content = 'Is this available?') => new Request('http://localhost/api/marketplace/listing-a/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });

describe('marketplace inquiry API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(buyer);
    mocks.listingFindUnique.mockResolvedValue({ id: 'listing-a', sellerId: 'seller-a', status: 'AVAILABLE', title: 'Vintage camera', images: [{ url: 'https://res.cloudinary.com/demo/item.jpg' }], seller: { id: 'seller-a', name: 'Seller', username: 'seller', profileImage: null } });
    mocks.transaction.mockImplementation(async (callback) => callback({
      directConversation: { upsert: mocks.conversationUpsert, update: mocks.conversationUpdate },
      directMessage: { create: mocks.messageCreate },
    }));
    mocks.conversationUpsert.mockResolvedValue({ id: 'conversation-a' });
    mocks.messageCreate.mockResolvedValue({ id: 'message-a', content: 'Is this available?', attachments: [], isRead: false, createdAt: new Date(), senderId: 'buyer-a', sender: buyer, marketplaceListing: { id: 'listing-a', title: 'Vintage camera', status: 'AVAILABLE', images: [{ url: 'https://res.cloudinary.com/demo/item.jpg' }] } });
    mocks.conversationUpdate.mockResolvedValue({});
  });

  it('creates a marketplace-enabled pair conversation and safe listing-referenced message without a bell notification', async () => {
    const response = await POST(request('Could I collect this today?'), context);
    expect(response.status).toBe(201);
    expect(mocks.conversationUpsert).toHaveBeenCalledWith(expect.objectContaining({ update: { marketplaceMessagingEnabled: true } }));
    expect(mocks.messageCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ marketplaceListingId: 'listing-a', content: 'Could I collect this today?' }) }));
    expect(mocks.publishMessage).toHaveBeenCalledWith(expect.any(Object), 'seller-a');
    expect(mocks.notificationCreate).not.toHaveBeenCalled();
    expect(JSON.stringify(await response.json())).not.toMatch(/email|phone|passwordHash|publicId|marketplaceMessagingEnabled/i);
  });

  it.each([
    ['unauthenticated', null, { sellerId: 'seller-a', status: 'AVAILABLE' }, 401],
    ['self inquiry', buyer, { sellerId: 'buyer-a', status: 'AVAILABLE' }, 400],
    ['sold listing', buyer, { sellerId: 'seller-a', status: 'SOLD_OUT' }, 400],
    ['missing listing', buyer, null, 404],
  ])('rejects %s inquiry safely', async (_label, user, listing, expectedStatus) => {
    mocks.getCurrentUser.mockResolvedValue(user);
    mocks.listingFindUnique.mockResolvedValue(listing);
    expect((await POST(request(), context)).status).toBe(expectedStatus);
    expect(mocks.messageCreate).not.toHaveBeenCalled();
  });
});
