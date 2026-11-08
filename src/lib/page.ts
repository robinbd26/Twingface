import type { Prisma } from '@prisma/client';

export const PAGE_TIMELINE_SIZE = 20;

export const safePageSelect = {
  id: true,
  name: true,
  handle: true,
  category: true,
  bio: true,
  avatarUrl: true,
  coverUrl: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, name: true, username: true, profileImage: true } },
} satisfies Prisma.PageSelect;

export type SafePage = Prisma.PageGetPayload<{ select: typeof safePageSelect }>;

export const safePagePostSelect = {
  id: true,
  content: true,
  imageUrl: true,
  pageId: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, username: true, profileImage: true } },
} satisfies Prisma.PagePostSelect;

export type SafePagePost = Prisma.PagePostGetPayload<{ select: typeof safePagePostSelect }>;