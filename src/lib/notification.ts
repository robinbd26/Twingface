import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { safeFriendUserSelect } from '@/lib/relationship';
import { publishNotification, type RealtimeNotification } from '@/lib/realtime';

export const DEFAULT_NOTIFICATIONS_PER_PAGE = 20;
export const MAX_NOTIFICATIONS_PER_PAGE = 50;

export type NotificationType = 'FRIEND_REQUEST' | 'FRIEND_ACCEPT' | 'MESSAGE';

// Only ever expose the safe actor fields — never the recipient/actor private data.
export const safeNotificationSelect = {
  id: true,
  type: true,
  entityId: true,
  isRead: true,
  createdAt: true,
  actor: { select: safeFriendUserSelect },
} satisfies Prisma.NotificationSelect;

export type NotificationRow = Prisma.NotificationGetPayload<{ select: typeof safeNotificationSelect }>;

export function toRealtimeNotification(row: NotificationRow): RealtimeNotification {
  return {
    id: row.id,
    type: row.type,
    entityId: row.entityId,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
    actor: row.actor,
  };
}

// Human-friendly copy for the bell dropdown, mirroring Facebook's phrasing.
export function describeNotification(type: NotificationType, actorName: string): string {
  const firstName = actorName.trim().split(/\s+/)[0] || actorName;
  if (type === 'FRIEND_REQUEST') return `${firstName} sent you a friend request.`;
  if (type === 'FRIEND_ACCEPT') return `${firstName} accepted your friend request.`;
  return `${firstName} sent you a message.`;
}

// Create + fan out a notification. Best-effort: a notification must never break
// the primary action (sending a message, accepting a friend, etc.), so any
// persistence error is swallowed by the caller's try/catch.
export async function createNotification(input: {
  type: NotificationType;
  recipientId: string;
  actor: { id: string; name: string; username: string; profileImage: string | null };
  entityId?: string | null;
}): Promise<RealtimeNotification | null> {
  if (input.recipientId === input.actor.id) return null;
  const row = await prisma.notification.create({
    data: {
      type: input.type,
      recipientId: input.recipientId,
      actorId: input.actor.id,
      entityId: input.entityId ?? null,
    },
    select: safeNotificationSelect,
  });
  const notification = toRealtimeNotification(row);
  publishNotification(notification, input.recipientId);
  return notification;
}

export function parseNotificationLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_NOTIFICATIONS_PER_PAGE;
  return Math.min(parsed, MAX_NOTIFICATIONS_PER_PAGE);
}
