import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { safeFriendUserSelect } from './relationship';

export const DEFAULT_FRIENDS_PER_PAGE = 24;
export const MAX_FRIENDS_PER_PAGE = 50;

export const CreateFriendRequestSchema = z.object({
  username: z.string().trim().min(1).max(30),
}).strict();

export const FriendRequestActionSchema = z.object({
  action: z.enum(['accept', 'reject']),
}).strict();

export const safeFriendshipSelect = {
  id: true,
  requesterId: true,
  recipientId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  requester: { select: safeFriendUserSelect },
  recipient: { select: safeFriendUserSelect },
} satisfies Prisma.FriendshipSelect;

export function parseFriendLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_FRIENDS_PER_PAGE;
  return Math.min(parsed, MAX_FRIENDS_PER_PAGE);
}
