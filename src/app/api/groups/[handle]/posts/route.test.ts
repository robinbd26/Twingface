import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), groupFindUnique: vi.fn(), membershipFindUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { group: { findUnique: mocks.groupFindUnique }, groupMembership: { findUnique: mocks.membershipFindUnique }, groupPost: { findMany: mocks.findMany, create: mocks.create } } }));
vi.mock('@/lib/cloudinary', () => ({ uploadPostImage: vi.fn(), destroyPostImage: vi.fn() }));
import { GET, POST } from './route';
const user = { id: 'u1', name: 'User', username: 'user', email: 'u@example.com', profileImage: null };
describe('group posts API', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCurrentUser.mockResolvedValue(user); mocks.groupFindUnique.mockResolvedValue({ id: 'g1', privacy: 'PUBLIC', postingPolicy: 'MEMBERS' }); mocks.membershipFindUnique.mockResolvedValue({ status: 'APPROVED', role: 'MEMBER' }); mocks.findMany.mockResolvedValue([]); mocks.create.mockResolvedValue({ id: 'p1', content: 'Hello', groupId: 'g1', authorId: 'u1' }); });
  it('allows public feed reads but requires approved membership before posting', async () => {
    expect((await GET(new Request('http://localhost'), { params: Promise.resolve({ handle: 'group' }) })).status).toBe(200);
    expect((await POST(new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: 'Hello' }) }), { params: Promise.resolve({ handle: 'group' }) })).status).toBe(201);
    mocks.membershipFindUnique.mockResolvedValue(null);
    expect((await POST(new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: 'Hello' }) }), { params: Promise.resolve({ handle: 'group' }) })).status).toBe(403);
  });
});
