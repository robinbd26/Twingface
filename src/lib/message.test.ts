import { describe, expect, it } from 'vitest';
import { canUseDirectConversation, CreateDirectMessageSchema, DEFAULT_CONVERSATIONS_PER_PAGE, DEFAULT_MESSAGES_PER_PAGE, MAX_CONVERSATIONS_PER_PAGE, MAX_MESSAGES_PER_PAGE, marketplaceConversationAccessSelect, parseConversationLimit, parseMessageLimit, safeDirectMessageSelect } from './message';

describe('direct message primitives', () => {
  it('trims valid message text and rejects empty or oversized text', () => {
    expect(CreateDirectMessageSchema.parse({ content: '  hello  ' })).toEqual({ content: 'hello' });
    expect(CreateDirectMessageSchema.safeParse({ content: '   ' }).success).toBe(false);
    expect(CreateDirectMessageSchema.safeParse({ content: 'x'.repeat(1001) }).success).toBe(false);
  });

  it('bounds message pages and keeps message select safe', () => {
    expect(parseMessageLimit(null)).toBe(DEFAULT_MESSAGES_PER_PAGE);
    expect(parseMessageLimit('999')).toBe(MAX_MESSAGES_PER_PAGE);
    expect(safeDirectMessageSelect).toMatchObject({ id: true, content: true, createdAt: true, sender: { select: { id: true, name: true, username: true, profileImage: true } } });
    expect(JSON.stringify(safeDirectMessageSelect)).not.toMatch(/email|phone|passwordHash|sessions/i);
    expect(safeDirectMessageSelect).toMatchObject({ marketplaceListing: { select: { id: true, title: true, status: true, images: { select: { url: true } } } } });
    expect(JSON.stringify(safeDirectMessageSelect)).not.toMatch(/publicId|marketplaceMessagingEnabled/i);
    expect(marketplaceConversationAccessSelect).toMatchObject({ participantOneId: true, participantTwoId: true, marketplaceMessagingEnabled: true, mediaWorldMessagingEnabled: true });
  });

  it('bounds inbox pages independently', () => {
    expect(parseConversationLimit(null)).toBe(DEFAULT_CONVERSATIONS_PER_PAGE);
    expect(parseConversationLimit('999')).toBe(MAX_CONVERSATIONS_PER_PAGE);
  });

  it('permits non-friends only when the exact pair has marketplace messaging enabled', async () => {
    const friendship = { findUnique: async () => null };
    const directConversation = { findUnique: async () => ({ participantOneId: 'buyer', participantTwoId: 'seller', marketplaceMessagingEnabled: true }) };
    await expect(canUseDirectConversation({ viewerId: 'buyer', otherUserId: 'seller', pairKey: 'buyer:seller' }, { friendship, directConversation } as never)).resolves.toBe(true);
    const wrongPair = { findUnique: async () => ({ participantOneId: 'buyer', participantTwoId: 'other', marketplaceMessagingEnabled: true }) };
    await expect(canUseDirectConversation({ viewerId: 'buyer', otherUserId: 'seller', pairKey: 'buyer:seller' }, { friendship, directConversation: wrongPair } as never)).resolves.toBe(false);
  });

  it('applies the same exact-pair exception to Media World profile conversations', async () => {
    const friendship = { findUnique: async () => null };
    const mediaWorld = { findUnique: async () => ({ participantOneId: 'professional', participantTwoId: 'viewer', mediaWorldMessagingEnabled: true }) };
    await expect(canUseDirectConversation({ viewerId: 'viewer', otherUserId: 'professional', pairKey: 'professional:viewer' }, { friendship, directConversation: mediaWorld } as never)).resolves.toBe(true);

    const noException = { findUnique: async () => ({ participantOneId: 'professional', participantTwoId: 'viewer' }) };
    await expect(canUseDirectConversation({ viewerId: 'viewer', otherUserId: 'professional', pairKey: 'professional:viewer' }, { friendship, directConversation: noException } as never)).resolves.toBe(false);

    const wrongPair = { findUnique: async () => ({ participantOneId: 'other', participantTwoId: 'viewer', mediaWorldMessagingEnabled: true }) };
    await expect(canUseDirectConversation({ viewerId: 'viewer', otherUserId: 'professional', pairKey: 'professional:viewer' }, { friendship, directConversation: wrongPair } as never)).resolves.toBe(false);
  });
});
