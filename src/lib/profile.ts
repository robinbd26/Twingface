import type { Prisma } from '@prisma/client';

export const safeProfileSelect = {
  id: true,
  name: true,
  username: true,
  bio: true,
  profileImage: true,
  coverImage: true,
  profession: true,
  education: true,
  currentCity: true,
  hometown: true,
  createdAt: true,
} satisfies Prisma.UserSelect;
export type Profile = Prisma.UserGetPayload<{ select: typeof safeProfileSelect }>;
