import type { Prisma } from '@prisma/client';

// A user is considered "online now" only if their last heartbeat is recent.
export const PRESENCE_ONLINE_WINDOW_MS = 60 * 1000; // 1 minute

export const safePresenceSelect = {
  isOnline: true,
  lastActiveAt: true,
} satisfies Prisma.UserPresenceSelect;

export function isPresenceActive(
  presence: { isOnline: boolean; lastActiveAt: Date } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!presence?.isOnline) return false;
  return now.getTime() - presence.lastActiveAt.getTime() <= PRESENCE_ONLINE_WINDOW_MS;
}

// Facebook-style relative label, e.g. "Active 25m ago", "Active 2h ago", "Active 3d ago".
export function formatLastActive(lastActiveAt: Date | string, now: Date = new Date()): string {
  const then = typeof lastActiveAt === 'string' ? new Date(lastActiveAt) : lastActiveAt;
  const seconds = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));
  if (seconds < 60) return 'Active just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Active ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Active ${days}d ago`;
}
