import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clientIp: vi.fn(),
  consumeRateLimit: vi.fn(),
  createSession: vi.fn(),
  findUnique: vi.fn(),
  resetRateLimit: vi.fn(),
  setSessionCookie: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  DUMMY_PASSWORD_HASH: 'dummy-hash',
  createSession: mocks.createSession,
  setSessionCookie: mocks.setSessionCookie,
  verifyPassword: mocks.verifyPassword,
}));

vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));

vi.mock('@/lib/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/rate-limit')>();
  return {
    ...actual,
    clientIp: mocks.clientIp,
    consumeRateLimit: mocks.consumeRateLimit,
    resetRateLimit: mocks.resetRateLimit,
  };
});

import { POST } from './route';

const user = {
  id: 'user-1',
  name: 'Farah Rahman',
  username: 'farah.rahman',
  email: 'farah@example.com',
  passwordHash: 'stored-hash',
  role: 'USER',
  accountType: 'PROFESSIONAL',
};

function request(body: unknown) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clientIp.mockReturnValue('203.0.113.10');
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true, remaining: 29, retryAfterSeconds: 0 });
    mocks.findUnique.mockResolvedValue(user);
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.resetRateLimit.mockResolvedValue(undefined);
    mocks.createSession.mockResolvedValue({ token: 'session-token', expiresAt: new Date('2026-10-15T00:00:00.000Z') });
  });

  it.each([
    ['User ID', ' Farah.Rahman ', { username: 'farah.rahman' }],
    ['email', ' FARAH@EXAMPLE.COM ', { email: 'farah@example.com' }],
    ['Bangladesh phone', '01712 345678', { phone: '+8801712345678' }],
  ])('signs in by %s with one targeted lookup', async (_label, identifier, where) => {
    const response = await POST(request({ identifier, password: 'StrongPass123' }));

    expect(response.status).toBe(200);
    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where }));
    expect(await response.json()).toEqual({ user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, accountType: user.accountType } });
  });

  it('accepts the legacy email request body during migration', async () => {
    const response = await POST(request({ email: ' FARAH@EXAMPLE.COM ', password: 'StrongPass123' }));

    expect(response.status).toBe(200);
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'farah@example.com' } }));
  });

  it('returns the same generic response for unknown accounts and malformed identifiers', async () => {
    mocks.findUnique.mockResolvedValueOnce(null);
    const unknown = await POST(request({ identifier: 'unknown.user', password: 'StrongPass123' }));
    const malformed = await POST(request({ identifier: 'bad user', password: 'StrongPass123' }));

    expect(unknown.status).toBe(401);
    expect(malformed.status).toBe(401);
    expect(await unknown.json()).toEqual(await malformed.json());
    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
  });

  it('runs password verification for unknown accounts so timing cannot reveal existence', async () => {
    mocks.findUnique.mockResolvedValueOnce(null);

    const response = await POST(request({ identifier: 'unknown.user', password: 'StrongPass123' }));

    expect(response.status).toBe(401);
    expect(mocks.verifyPassword).toHaveBeenCalledWith('StrongPass123', 'dummy-hash');
  });

  it('returns the generic response when password verification fails', async () => {
    mocks.verifyPassword.mockResolvedValue(false);

    const response = await POST(request({ identifier: 'farah.rahman', password: 'WrongPass123' }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Invalid email or password.' });
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(mocks.resetRateLimit).not.toHaveBeenCalled();
  });

  it('clears the identifier counter after a successful sign-in', async () => {
    await POST(request({ identifier: 'farah.rahman', password: 'StrongPass123' }));

    expect(mocks.resetRateLimit).toHaveBeenCalledWith('login:id:username:farah.rahman');
  });

  it('throttles an address that has spent its attempt budget', async () => {
    mocks.consumeRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSeconds: 600 });

    const response = await POST(request({ identifier: 'farah.rahman', password: 'StrongPass123' }));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('600');
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith('login:ip:203.0.113.10', expect.objectContaining({ limit: 30 }));
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it('throttles a single identifier even when the address still has budget', async () => {
    mocks.consumeRateLimit
      .mockResolvedValueOnce({ allowed: true, remaining: 29, retryAfterSeconds: 0 })
      .mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSeconds: 120 });

    const response = await POST(request({ identifier: 'farah.rahman', password: 'StrongPass123' }));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('120');
    expect(mocks.consumeRateLimit).toHaveBeenLastCalledWith('login:id:username:farah.rahman', expect.objectContaining({ limit: 5 }));
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
