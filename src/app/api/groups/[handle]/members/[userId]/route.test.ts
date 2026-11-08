import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), groupFindUnique: vi.fn(), membershipFindUnique: vi.fn(), membershipUpdate: vi.fn(), membershipDelete: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { group: { findUnique: mocks.groupFindUnique }, groupMembership: { findUnique: mocks.membershipFindUnique, update: mocks.membershipUpdate, delete: mocks.membershipDelete, } } }));
import { PATCH } from './route';
const admin = { id: 'admin-a', name: 'A', username: 'admin', email: 'a@example.com', profileImage: null };
describe('group member action API', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCurrentUser.mockResolvedValue(admin); mocks.groupFindUnique.mockResolvedValue({ id: 'g1' }); mocks.membershipFindUnique.mockImplementation(({ where }: { where: { groupId_userId: { userId: string } } }) => Promise.resolve(where.groupId_userId.userId === 'admin-a' ? { id: 'actor', status: 'APPROVED', role: 'ADMIN' } : { id: 'target', status: 'PENDING', role: 'MEMBER' })); mocks.membershipUpdate.mockResolvedValue({ id: 'target', status: 'APPROVED' }); });
  it('allows an approved admin to approve a pending member but blocks self actions', async () => {
    const context = { params: Promise.resolve({ handle: 'group', userId: 'user-b' }) };
    expect((await PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ action: 'approve' }) }), context)).status).toBe(200);
    expect(mocks.membershipUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'APPROVED' } }));
    expect((await PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ action: 'remove' }) }), { params: Promise.resolve({ handle: 'group', userId: 'admin-a' }) })).status).toBe(400);
  });
});
