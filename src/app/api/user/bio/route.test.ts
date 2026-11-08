import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), update: vi.fn() }));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { user: { update: mocks.update } } }));

import { PUT } from './route';

const safeProfile = {
  id: 'user-a',
  name: 'Robin Mondol',
  username: 'robin',
  bio: 'Building useful things in Dhaka.',
  profileImage: null,
  coverImage: null,
  profession: null,
  education: null,
  currentCity: null,
  hometown: null,
  createdAt: new Date('2026-10-14'),
};

const request = (body: unknown) => new Request('http://localhost/api/user/bio', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

describe('PUT /api/user/bio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-a', name: 'Robin', username: 'robin', email: 'private@example.com', profileImage: null });
    mocks.update.mockResolvedValue(safeProfile);
  });

  it('rejects unauthenticated updates before parsing or writing', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    expect((await PUT(request({ bio: 'Hello' }))).status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('updates only the session user with a normalized bio', async () => {
    const response = await PUT(request({ bio: '  Building useful things in Dhaka.  ' }));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-a' },
      data: { bio: 'Building useful things in Dhaka.' },
    }));
  });

  it('normalizes whitespace-only bio to null', async () => {
    expect((await PUT(request({ bio: '   ' }))).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: { bio: null } }));
  });

  it('rejects protected or unknown fields before writing', async () => {
    const response = await PUT(request({ bio: 'Hello', id: 'user-b', passwordHash: 'attacker-value' }));

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('returns a safe response and maps persistence failures to a generic error', async () => {
    const response = await PUT(request({ bio: 'Hello' }));
    const body = JSON.stringify(await response.json());
    expect(body).not.toContain('private@example.com');
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('tokenHash');

    mocks.update.mockRejectedValue(new Error('database connection internals'));
    const failure = await PUT(request({ bio: 'Hello' }));
    expect(failure.status).toBe(500);
    expect(JSON.stringify(await failure.json())).not.toContain('database connection internals');
  });
});
