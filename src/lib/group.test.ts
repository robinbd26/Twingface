import { describe, expect, it } from 'vitest';
import {
  canPostInGroup,
  canViewGroup,
  DEFAULT_GROUPS_PER_PAGE,
  parseGroupLimit,
  safeGroupMemberSelect,
  safeGroupPostSelect,
  safeGroupSelect,
} from './group';

const publicGroup = { privacy: 'PUBLIC', postingPolicy: 'MEMBERS' } as const;
const privateGroup = { privacy: 'PRIVATE', postingPolicy: 'MEMBERS' } as const;
const approvedMember = { status: 'APPROVED', role: 'MEMBER' } as const;

describe('group access helpers', () => {
  it('allows everyone to view public groups but only approved members to view private groups', () => {
    expect(canViewGroup(publicGroup, null)).toBe(true);
    expect(canViewGroup(privateGroup, null)).toBe(false);
    expect(canViewGroup(privateGroup, { status: 'PENDING', role: 'MEMBER' })).toBe(false);
    expect(canViewGroup(privateGroup, approvedMember)).toBe(true);
  });

  it('enforces the group posting policy against the fresh approved membership role', () => {
    expect(canPostInGroup(publicGroup, null)).toBe(false);
    expect(canPostInGroup(publicGroup, approvedMember)).toBe(true);
    expect(canPostInGroup({ ...privateGroup, postingPolicy: 'ADMINS_ONLY' }, approvedMember)).toBe(false);
    expect(canPostInGroup({ ...privateGroup, postingPolicy: 'ADMINS_ONLY' }, { status: 'APPROVED', role: 'MODERATOR' })).toBe(true);
    expect(canPostInGroup({ ...privateGroup, postingPolicy: 'ADMINS_ONLY' }, { status: 'REJECTED', role: 'ADMIN' })).toBe(false);
  });
});

describe('group safe projections and pagination', () => {
  it('keeps internal media identifiers and private user fields out of public projections', () => {
    expect(safeGroupSelect).not.toHaveProperty('creator.passwordHash');
    expect(safeGroupMemberSelect.user.select).toEqual({ id: true, name: true, username: true, profileImage: true });
    expect(safeGroupPostSelect).toHaveProperty('imageUrl', true);
    expect(safeGroupPostSelect).not.toHaveProperty('imagePublicId');
  });

  it('falls back to the default page size and caps excessive limits', () => {
    expect(parseGroupLimit(null)).toBe(DEFAULT_GROUPS_PER_PAGE);
    expect(parseGroupLimit('not-a-number')).toBe(DEFAULT_GROUPS_PER_PAGE);
    expect(parseGroupLimit('999')).toBe(50);
  });
});
