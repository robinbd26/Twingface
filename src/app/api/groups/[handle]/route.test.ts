import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), groupFindUnique: vi.fn(), groupUpdate: vi.fn(), membershipFindUnique: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { group: { findUnique: mocks.groupFindUnique, update: mocks.groupUpdate }, groupMembership: { findUnique: mocks.membershipFindUnique } } }));
import { GET, PATCH } from './route';
const viewer = { id: 'user-b', name: 'B', username: 'bob', email: 'b@example.com', profileImage: null };
const privateGroup = { id: 'g1', name: 'Private', handle: 'private', privacy: 'PRIVATE', postingPolicy: 'MEMBERS', coverImage: null, creatorId: 'user-a', createdAt: new Date(), updatedAt: new Date(), creator: { id: 'user-a', name: 'A', username: 'a', profileImage: null }, _count: { memberships: 1 } };
describe('group detail API', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCurrentUser.mockResolvedValue(viewer); mocks.groupFindUnique.mockResolvedValue(privateGroup); mocks.membershipFindUnique.mockResolvedValue({ status: 'PENDING', role: 'MEMBER' }); mocks.groupUpdate.mockResolvedValue(privateGroup); });
  it('hides private membership state from nonmembers but returns safe limited metadata', async () => {
    const response = await GET(new Request('http://localhost'), { params: Promise.resolve({ handle: 'private' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.group).toMatchObject({ handle: 'private', privacy: 'PRIVATE' });
    expect(body.viewerMembership).toEqual({ status: 'PENDING', role: 'MEMBER' });
    expect(JSON.stringify(body)).not.toContain('passwordHash');
  });
  it('only lets approved admins update settings', async () => {
    const context = { params: Promise.resolve({ handle: 'private' }) };
    const request = new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Updated' }) });
    expect((await PATCH(request, context)).status).toBe(403);
    mocks.membershipFindUnique.mockResolvedValue({ status: 'APPROVED', role: 'ADMIN' });
    expect((await PATCH(request, context)).status).toBe(200);
    expect(mocks.groupUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'Updated' } }));
  });
});
