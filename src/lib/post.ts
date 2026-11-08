import type { Prisma } from '@prisma/client';

export const MAX_POSTS_PER_PAGE = 50;
export const DEFAULT_POSTS_PER_PAGE = 12;

export const safePostSelect = {
  id: true,
  content: true,
  imageUrl: true,
  feelingActivity: true,
  youtubeUrl: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { comments: true } },
  author: { select: { id: true, name: true, username: true, profileImage: true } },
} satisfies Prisma.PostSelect;

export type SafePost = Prisma.PostGetPayload<{ select: typeof safePostSelect }>;

export function parsePostLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_POSTS_PER_PAGE;
  return Math.min(parsed, MAX_POSTS_PER_PAGE);
}
