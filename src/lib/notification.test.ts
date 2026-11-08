import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  publish: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: { notification: { create: mocks.create } } }));
vi.mock('@/lib/realtime', () => ({ publishNotification: mocks.publish }));

import { createNotification, describeNotification, parseNotificationLimit, toRealtimeNotification } from './notification';

const actor = { id: 'user-a', name: 'Alice Rahman', username: 'alice', profileImage: null };

describe('notification lib', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseNotificationLimit', () => {
    it('falls back to the default for missing or invalid input', () => {
      expect(parseNotificationLimit(null)).toBe(20);
      expect(parseNotificationLimit('abc')).toBe(20);
      expect(parseNotificationLimit('0')).toBe(20);
    });

    it('caps the limit at the maximum', () => {
      expect(parseNotificationLimit('10')).toBe(10);
      expect(parseNotificationLimit('999')).toBe(50);
    });
  });

  describe('describeNotification', () => {
    it('uses the actor first name and the right phrasing per type', () => {
      expect(describeNotification('FRIEND_REQUEST', 'Alice Rahman')).toBe('Alice sent you a friend request.');
      expect(describeNotification('FRIEND_ACCEPT', 'Alice Rahman')).toBe('Alice accepted your friend request.');
      expect(describeNotification('MESSAGE', 'Alice Rahman')).toBe('Alice sent you a message.');
    });
  });

  describe('toRealtimeNotification', () => {
    it('projects only safe fields and serialises the timestamp', () => {
      const row = {
        id: 'n1',
        type: 'MESSAGE' as const,
        entityId: 'm1',
        isRead: false,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        actor,
      };
      expect(toRealtimeNotification(row)).toEqual({
        id: 'n1',
        type: 'MESSAGE',
        entityId: 'm1',
        isRead: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        actor,
      });
    });
  });

  describe('createNotification', () => {
    it('persists with the safe select and fans out to the recipient', async () => {
      const row = {
        id: 'n1', type: 'FRIEND_REQUEST', entityId: 'f1', isRead: false,
        createdAt: new Date('2024-01-01T00:00:00.000Z'), actor,
      };
      mocks.create.mockResolvedValue(row);

      const result = await createNotification({ type: 'FRIEND_REQUEST', recipientId: 'user-b', actor, entityId: 'f1' });

      expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
        data: { type: 'FRIEND_REQUEST', recipientId: 'user-b', actorId: 'user-a', entityId: 'f1' },
        select: expect.any(Object),
      }));
      expect(mocks.publish).toHaveBeenCalledTimes(1);
      expect(mocks.publish.mock.calls[0][0]).toMatchObject({ id: 'n1', type: 'FRIEND_REQUEST' });
      expect(mocks.publish.mock.calls[0][1]).toBe('user-b');
      expect(result?.id).toBe('n1');
    });

    it('does not notify a user about their own action', async () => {
      const result = await createNotification({ type: 'MESSAGE', recipientId: actor.id, actor });
      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.publish).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});
