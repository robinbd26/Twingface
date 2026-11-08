import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), groupFindUnique: vi.fn(), membershipFindUnique: vi.fn(), membershipUpsert: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { group: { findUnique: mocks.groupFindUnique }, groupMembership: { findUnique: mocks.membershipFindUnique, upsert: mocks.membershipUpsert } } }));
import { POST } from './route';

const viewer = { id: 'user-b', name: 'B', username: 'bob', email: 'b@example.com', profileImage: null };
const publicGroup = { id: 'g1', handle: 'public-group', privacy: 'PUBLIC' };

describe('group membership API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.groupFindUnique.mockResolvedValue(publicGroup);
    mocks.membershipUpsert.mockResolvedValue({ id: 'm1', groupId: 'g1', userId: 'user-b', role: 'MEMBER', status: 'APPROVED' });
  });

  it('immediately approves public joins and makes private joins pending', async () => {
    const context = { params: Promise.resolve({ handle: 'public-group' }) };
    expect((await POST(new Request('http://localhost'), context)).status).toBe(200);
    expect(mocks.membershipUpsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ status: 'APPROVED' }) }));
    mocks.groupFindUnique.mockResolvedValue({ ...publicGroup, privacy: 'PRIVATE' });
    await POST(new Request('http://localhost'), context);
    expect(mocks.membershipUpsert).toHaveBeenLastCalledWith(expect.objectContaining({ create: expect.objectContaining({ status: 'PENDING' }) }));
  });

  it('does not write for unauthenticated users or missing groups', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await POST(new Request('http://localhost'), { params: Promise.resolve({ handle: 'public-group' }) })).status).toBe(401);
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.groupFindUnique.mockResolvedValue(null);
    expect((await POST(new Request('http://localhost'), { params: Promise.resolve({ handle: 'public-group' }) })).status).toBe(404);
  });
});
