import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), groupFindUnique: vi.fn(), membershipFindUnique: vi.fn(), membershipFindMany: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { group: { findUnique: mocks.groupFindUnique }, groupMembership: { findUnique: mocks.membershipFindUnique, findMany: mocks.membershipFindMany } } }));
import { GET } from './route';
const viewer = { id: 'user-b', name: 'B', username: 'bob', email: 'b@example.com', profileImage: null };
describe('group members API', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCurrentUser.mockResolvedValue(viewer); mocks.groupFindUnique.mockResolvedValue({ id: 'g1', privacy: 'PRIVATE' }); mocks.membershipFindUnique.mockResolvedValue({ status: 'APPROVED' }); mocks.membershipFindMany.mockResolvedValue([]); });
  it('requires approved membership before listing private members', async () => {
    const context = { params: Promise.resolve({ handle: 'private-group' }) };
    expect((await GET(new Request('http://localhost'), context)).status).toBe(200);
    expect(mocks.membershipFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { groupId: 'g1', status: 'APPROVED' } }));
    mocks.membershipFindUnique.mockResolvedValue({ status: 'PENDING' });
    expect((await GET(new Request('http://localhost'), context)).status).toBe(403);
  });
});
