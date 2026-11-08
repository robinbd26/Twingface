import type { Prisma } from '@prisma/client';

export const DEFAULT_PROFILE_PHOTOS_PER_PAGE = 24;
export const MAX_PROFILE_PHOTOS_PER_PAGE = 50;

export const safeProfilePhotoSelect = {
  id: true,
  imageUrl: true,
  createdAt: true,
} satisfies Prisma.PostSelect;

export type SafeProfilePhoto = Prisma.PostGetPayload<{ select: typeof safeProfilePhotoSelect }>;

export const profilePhotoOrderBy = [{ createdAt: 'desc' }, { id: 'desc' }] satisfies Prisma.PostOrderByWithRelationInput[];

export function parseProfilePhotoLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_PROFILE_PHOTOS_PER_PAGE;
  return Math.min(parsed, MAX_PROFILE_PHOTOS_PER_PAGE);
}

export function profilePhotoQuery(authorId: string, take: number, cursor?: string) {
  return {
    where: { authorId, imageUrl: { not: null } },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: profilePhotoOrderBy,
    select: safeProfilePhotoSelect,
  } satisfies Prisma.PostFindManyArgs;
}
