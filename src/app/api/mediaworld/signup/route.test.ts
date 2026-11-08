import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clientIp: vi.fn(),
  consumeRateLimit: vi.fn(),
  create: vi.fn(),
  findUnique: vi.fn(),
  createSession: vi.fn(),
  hashPassword: vi.fn(),
  setSessionCookie: vi.fn(),
  suggestedUserId: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  createSession: mocks.createSession,
  hashPassword: mocks.hashPassword,
  setSessionCookie: mocks.setSessionCookie,
}));

vi.mock('@/lib/db', () => ({ prisma: { user: { create: mocks.create, findUnique: mocks.findUnique } } }));

vi.mock('@/lib/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/rate-limit')>();
  return { ...actual, clientIp: mocks.clientIp, consumeRateLimit: mocks.consumeRateLimit };
});

vi.mock('@/lib/user-id', () => ({ createSuggestedUserId: mocks.suggestedUserId }));

import { POST } from './route';

const body = {
  name: 'Farah Rahman',
  email: 'farah@example.com',
  phone: '01712345678',
  password: 'StrongPass123',
  confirmPassword: 'StrongPass123',
  division: 'Dhaka',
  district: 'Dhaka',
  presentAddress: 'House 12, Road 5, Dhanmondi',
};

const savedUser = {
  id: 'user-1',
  name: 'Farah Rahman',
  username: 'farah.rahman-abc123',
  email: 'farah@example.com',
  phone: '+8801712345678',
  division: 'Dhaka',
  district: 'Dhaka',
  presentAddress: 'House 12, Road 5, Dhanmondi',
};

function request(value: unknown) {
  return new Request('http://localhost/api/mediaworld/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
}

describe('POST /api/mediaworld/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clientIp.mockReturnValue('203.0.113.10');
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 });
    mocks.hashPassword.mockResolvedValue('hashed-password');
    mocks.findUnique.mockResolvedValue(null);
    mocks.suggestedUserId.mockReturnValue('farah.rahman-abc123');
    mocks.create.mockResolvedValue(savedUser);
    mocks.createSession.mockResolvedValue({ token: 'session-token', expiresAt: new Date('2026-11-24T00:00:00.000Z') });
  });

  it('creates a professional account with hashed credentials and signs the user in', async () => {
    const response = await POST(request(body));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ user: savedUser });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'Farah Rahman',
        email: 'farah@example.com',
        phone: '+8801712345678',
        passwordHash: 'hashed-password',
        division: 'Dhaka',
        district: 'Dhaka',
        presentAddress: 'House 12, Road 5, Dhanmondi',
        accountType: 'PROFESSIONAL',
      }),
    }));
    expect(mocks.create.mock.calls[0][0].data).not.toHaveProperty('password');
    expect(mocks.createSession).toHaveBeenCalledWith('user-1');
    expect(mocks.setSessionCookie).toHaveBeenCalledWith('session-token', new Date('2026-11-24T00:00:00.000Z'));
  });

  it('persists an optional bio and returns it from the created account', async () => {
    const response = await POST(request({ ...body, bio: '  Stage and screen actor ' }));

    expect(response.status).toBe(201);
    expect(mocks.create.mock.calls[0][0].data.bio).toBe('Stage and screen actor');
    expect(mocks.create.mock.calls[0][0].select).toMatchObject({ bio: true });
  });

  it('stores a blank bio as null instead of failing account creation', async () => {
    const response = await POST(request({ ...body, bio: '   ' }));

    expect(response.status).toBe(201);
    expect(mocks.create.mock.calls[0][0].data.bio).toBeNull();
  });

  it('rejects invalid details without touching the database', async () => {
    const response = await POST(request({ ...body, phone: '0123' }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Please correct the highlighted fields.');
    expect(json.fields.phone).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.hashPassword).not.toHaveBeenCalled();
  });

  it('rejects a district outside the selected division', async () => {
    const response = await POST(request({ ...body, district: 'Sylhet' }));

    expect(response.status).toBe(400);
    expect((await response.json()).fields.district).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('throttles repeated Media World signups from one address', async () => {
    mocks.consumeRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSeconds: 1800 });

    const response = await POST(request(body));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('1800');
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith('signup:mediaworld:ip:203.0.113.10', expect.objectContaining({ limit: 5 }));
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('reports a duplicate email safely', async () => {
    mocks.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['email'] },
    }));

    const response = await POST(request(body));

    expect(response.status).toBe(409);
    expect((await response.json()).fields).toEqual({ email: ['That email is already in use.'] });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it('retries with a fresh User ID when the suggestion is taken', async () => {
    mocks.findUnique.mockResolvedValueOnce({ id: 'existing' }).mockResolvedValueOnce(null);
    mocks.suggestedUserId.mockReturnValueOnce('farah.rahman-dup1').mockReturnValueOnce('farah.rahman-dup2');

    const response = await POST(request(body));

    expect(response.status).toBe(201);
    expect(mocks.suggestedUserId).toHaveBeenCalledTimes(2);
    expect(mocks.create.mock.calls[0][0].data.username).toBe('farah.rahman-dup2');
  });

  it('retries after a username collision race on create', async () => {
    mocks.suggestedUserId.mockReturnValueOnce('farah.rahman-dup1').mockReturnValueOnce('farah.rahman-dup2');
    mocks.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['username'] },
    }));

    const response = await POST(request(body));

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(mocks.create.mock.calls[1][0].data.username).toBe('farah.rahman-dup2');
  });

  it('returns a generic failure when the database is unavailable', async () => {
    mocks.create.mockRejectedValue(new Error('connection lost'));

    const response = await POST(request(body));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Unable to create your account. Please try again.' });
  });
});
