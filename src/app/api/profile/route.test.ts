import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), update: vi.fn() }));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { user: { update: mocks.update } } }));

import { PATCH } from './route';

const valid = { name: 'Farah Rahman', username: 'farah.rahman', bio: 'Hello', profileImage: 'https://example.com/avatar.jpg', coverImage: '' };
const safeProfile = { id: 'user-a', ...valid, coverImage: null, createdAt: new Date('2026-01-01') };
const request = (body: unknown) => new Request('http://localhost/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('PATCH /api/profile', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCurrentUser.mockResolvedValue({ id: 'user-a', name: 'Farah', username: 'farah', email: 'farah@example.com' }); mocks.update.mockResolvedValue(safeProfile); });

  it('rejects unauthenticated updates', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await PATCH(request(valid));
    expect(response.status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('updates only the authenticated user and strips mass-assigned fields', async () => {
    const response = await PATCH(request({ ...valid, id: 'user-b', passwordHash: 'not-allowed', sessions: [{ tokenHash: 'not-allowed' }] }));
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user-a' }, data: { ...valid, coverImage: null } }));
    const body = await response.json();
    expect(body.profile).toMatchObject({ id: 'user-a', username: 'farah.rahman' });
    expect(JSON.stringify(body)).not.toContain('passwordHash');
    expect(JSON.stringify(body)).not.toContain('tokenHash');
  });

  it('rejects invalid URLs and profile input before updating', async () => {
    const response = await PATCH(request({ ...valid, profileImage: 'http://unsafe.example/image.jpg', bio: 'x'.repeat(501) }));
    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('returns a safe conflict error for duplicate usernames', async () => {
    mocks.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '6.19.3', meta: { target: ['username'] } }));
    const response = await PATCH(request(valid));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ fields: { username: ['That username is already in use.'] } });
  });
});
