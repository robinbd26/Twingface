import { describe, expect, it, vi } from 'vitest';
import { acceptedFriendIds, countMutualFriendsBatch, makePairKey, safeFriendUserSelect } from './relationship';

describe('relationship primitives', () => {
  it('creates one stable pair key regardless of request direction', () => {
    expect(makePairKey('user-b', 'user-a')).toBe('user-a:user-b');
    expect(makePairKey('user-a', 'user-b')).toBe('user-a:user-b');
  });

  it('rejects a self relationship before persistence', () => {
    expect(() => makePairKey('user-a', 'user-a')).toThrow('You cannot create a relationship with yourself.');
  });

  it('selects only public friend fields', () => {
    expect(safeFriendUserSelect).toEqual({ id: true, name: true, username: true, profileImage: true });
    expect(JSON.stringify(safeFriendUserSelect)).not.toMatch(/email|phone|passwordHash|sessions/i);
  });

  it('counts mutual friends in a single batched round-trip', async () => {
    // me ↔ [shared, mine-only]; alice ↔ [shared]; bob ↔ [stranger]
    const rows = [
      { requesterId: 'me', recipientId: 'shared' },
      { requesterId: 'me', recipientId: 'mine-only' },
      { requesterId: 'alice', recipientId: 'shared' },
      { requesterId: 'bob', recipientId: 'stranger' },
    ];
    const client = { friendship: { findMany: vi.fn(async () => rows) } };
    const counts = await countMutualFriendsBatch('me', ['alice', 'bob', 'me'], client);
    expect(counts.get('alice')).toBe(1);
    expect(counts.get('bob')).toBe(0);
    expect(counts.has('me')).toBe(false);
    // Exactly 2 queries: viewer friends + all candidates' friendships.
    expect(client.friendship.findMany).toHaveBeenCalledTimes(2);
  });

  it('returns an empty map without querying when there is nothing to count', async () => {
    const client = { friendship: { findMany: vi.fn(async () => []) } };
    const counts = await countMutualFriendsBatch('me', [], client);
    expect(counts.size).toBe(0);
    expect(client.friendship.findMany).not.toHaveBeenCalled();
  });

  it('collects accepted friend ids from both directions', async () => {
    const client = {
      friendship: {
        findMany: vi.fn(async () => [
          { requesterId: 'me', recipientId: 'a' },
          { requesterId: 'b', recipientId: 'me' },
        ]),
      },
    };
    const ids = await acceptedFriendIds('me', client);
    expect([...ids].sort()).toEqual(['a', 'b']);
  });
});
