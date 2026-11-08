import type { Prisma } from '@prisma/client';

export const DEFAULT_COMMENTS_PER_PAGE = 20;
export const MAX_COMMENTS_PER_PAGE = 50;

export const safeCommentSelect = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, username: true, profileImage: true } },
} satisfies Prisma.CommentSelect;

export type SafeComment = Prisma.CommentGetPayload<{ select: typeof safeCommentSelect }>;

export function parseCommentLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_COMMENTS_PER_PAGE;
  return Math.min(parsed, MAX_COMMENTS_PER_PAGE);
}
