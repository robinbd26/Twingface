import type { Prisma } from '@prisma/client';

export const DEFAULT_GROUPS_PER_PAGE = 20;
export const MAX_GROUPS_PER_PAGE = 50;

type GroupAccess = { privacy: 'PUBLIC' | 'PRIVATE'; postingPolicy: 'MEMBERS' | 'ADMINS_ONLY' };
type MembershipAccess = { status: 'PENDING' | 'APPROVED' | 'REJECTED'; role: 'ADMIN' | 'MODERATOR' | 'MEMBER' } | null;

const safeUserSelect = { id: true, name: true, username: true, profileImage: true } satisfies Prisma.UserSelect;

export const safeGroupSelect = {
  id: true,
  name: true,
  handle: true,
  description: true,
  privacy: true,
  postingPolicy: true,
  coverImage: true,
  creatorId: true,
  createdAt: true,
  updatedAt: true,
  creator: { select: safeUserSelect },
  _count: { select: { memberships: { where: { status: 'APPROVED' } } } },
} satisfies Prisma.GroupSelect;

export const safeGroupMemberSelect = {
  id: true,
  groupId: true,
  userId: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: { select: safeUserSelect },
} satisfies Prisma.GroupMembershipSelect;

export const safeGroupPostSelect = {
  id: true,
  groupId: true,
  authorId: true,
  content: true,
  imageUrl: true,
  feelingActivity: true,
  youtubeUrl: true,
  createdAt: true,
  updatedAt: true,
  author: { select: safeUserSelect },
} satisfies Prisma.GroupPostSelect;

export type SafeGroup = Prisma.GroupGetPayload<{ select: typeof safeGroupSelect }>;
export type SafeGroupMember = Prisma.GroupMembershipGetPayload<{ select: typeof safeGroupMemberSelect }>;
export type SafeGroupPost = Prisma.GroupPostGetPayload<{ select: typeof safeGroupPostSelect }>;

export function parseGroupLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_GROUPS_PER_PAGE;
  return Math.min(parsed, MAX_GROUPS_PER_PAGE);
}

export function canViewGroup(group: Pick<GroupAccess, 'privacy'>, membership: MembershipAccess): boolean {
  return group.privacy === 'PUBLIC' || membership?.status === 'APPROVED';
}

export function canPostInGroup(group: GroupAccess, membership: MembershipAccess): boolean {
  if (membership?.status !== 'APPROVED') return false;
  if (group.postingPolicy === 'MEMBERS') return true;
  return membership.role === 'ADMIN' || membership.role === 'MODERATOR';
}
