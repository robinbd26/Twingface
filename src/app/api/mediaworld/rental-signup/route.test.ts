import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clientIp: vi.fn(),
  consumeRateLimit: vi.fn(),
  findUnique: vi.fn(),
  transaction: vi.fn(),
  providerUpdate: vi.fn(),
  createSession: vi.fn(),
  hashPassword: vi.fn(),
  setSessionCookie: vi.fn(),
  suggestedUserId: vi.fn(),
  uploadLogo: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  createSession: mocks.createSession,
  hashPassword: mocks.hashPassword,
  setSessionCookie: mocks.setSessionCookie,
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mocks.findUnique },
    rentalProvider: { update: mocks.providerUpdate },
    $transaction: mocks.transaction,
  },
}));

vi.mock('@/lib/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/rate-limit')>();
  return { ...actual, clientIp: mocks.clientIp, consumeRateLimit: mocks.consumeRateLimit };
});

vi.mock('@/lib/user-id', () => ({ createSuggestedUserId: mocks.suggestedUserId }));

vi.mock('@/lib/cloudinary', () => ({ uploadMediaWorldLogo: mocks.uploadLogo }));

import { POST } from './route';

const body = {
  name: 'Jahangir Alam',
  email: 'jahangir@example.com',
  phone: '01712345678',
  password: 'StrongPass123',
  confirmPassword: 'StrongPass123',
  division: 'Dhaka',
  district: 'Dhaka',
  presentAddress: 'House 12, Road 5, Mirpur',
  ownerName: 'Jahangir Alam',
  location: 'Mirpur, Dhaka',
  description: 'Camera, light and sound gear on daily rent.',
};

const createdUser = {
  id: 'user-1',
  name: 'Jahangir Alam',
  username: 'jahangir.alam-abc123',
  email: 'jahangir@example.com',
  phone: '+8801712345678',
  division: 'Dhaka',
  district: 'Dhaka',
  presentAddress: 'House 12, Road 5, Mirpur',
  accountType: 'RENTAL',
};

const createdProvider = {
  id: 'provider-1',
  ownerName: 'Jahangir Alam',
  businessName: null,
  phone: '+8801712345678',
  email: 'jahangir@example.com',
  location: 'Mirpur, Dhaka',
  fullAddress: null,
  description: 'Camera, light and sound gear on daily rent.',
  logoUrl: null,
};

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]);

let userCreate: ReturnType<typeof vi.fn>;
let providerCreate: ReturnType<typeof vi.fn>;

function transactionRunner() {
  return async (callback: (tx: {
    user: { create: (args: { data: Record<string, unknown>; select: unknown }) => Promise<unknown> };
    rentalProvider: { create: (args: { data: Record<string, unknown>; select: unknown }) => Promise<unknown> };
  }) => Promise<unknown>) => callback({
    user: { create: userCreate },
    rentalProvider: { create: providerCreate },
  });
}

function runTransaction() {
  mocks.transaction.mockImplementation(transactionRunner());
}

function jsonRequest(value: unknown) {
  return new Request('http://localhost/api/mediaworld/rental-signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  });
}

function formRequest(fields: Record<string, string>, logo?: Blob) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  if (logo) form.set('logo', logo);
  return new Request('http://localhost/api/mediaworld/rental-signup', { method: 'POST', body: form });
}

describe('POST /api/mediaworld/rental-signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userCreate = vi.fn().mockResolvedValue(createdUser);
    providerCreate = vi.fn().mockResolvedValue(createdProvider);
    runTransaction();

    mocks.clientIp.mockReturnValue('203.0.113.10');
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 });
    mocks.hashPassword.mockResolvedValue('hashed-password');
    mocks.findUnique.mockResolvedValue(null);
    mocks.suggestedUserId.mockReturnValue('jahangir.alam-abc123');
    mocks.createSession.mockResolvedValue({ token: 'session-token', expiresAt: new Date('2026-11-24T00:00:00.000Z') });
  });

  it('opens a For Rent account with its provider profile and signs the provider in', async () => {
    const response = await POST(jsonRequest(body));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ user: createdUser, provider: createdProvider });

    expect(userCreate).toHaveBeenCalledTimes(1);
    const userData = userCreate.mock.calls[0][0].data;
    expect(userData).toMatchObject({
      name: 'Jahangir Alam',
      email: 'jahangir@example.com',
      phone: '+8801712345678',
      passwordHash: 'hashed-password',
      division: 'Dhaka',
      district: 'Dhaka',
      presentAddress: 'House 12, Road 5, Mirpur',
      accountType: 'RENTAL',
    });
    expect(userData).not.toHaveProperty('password');
    expect(userData).not.toHaveProperty('confirmPassword');
    expect(userData).not.toHaveProperty('bio');

    expect(providerCreate.mock.calls[0][0].data).toMatchObject({
      userId: 'user-1',
      ownerName: 'Jahangir Alam',
      location: 'Mirpur, Dhaka',
      businessName: null,
      fullAddress: null,
    });
    expect(mocks.createSession).toHaveBeenCalledWith('user-1');
    expect(mocks.setSessionCookie).toHaveBeenCalledWith('session-token', new Date('2026-11-24T00:00:00.000Z'));
  });

  it('never stores the password in plain text', async () => {
    await POST(jsonRequest(body));

    expect(mocks.hashPassword).toHaveBeenCalledWith('StrongPass123');
    const persisted = JSON.stringify(userCreate.mock.calls[0][0]);
    expect(persisted).not.toContain('StrongPass123');
  });

  it('reads the same fields from a multipart submit so a logo can travel with them', async () => {
    const response = await POST(formRequest({ ...body, businessName: 'Camera Bazar' }));

    expect(response.status).toBe(201);
    expect(providerCreate.mock.calls[0][0].data).toMatchObject({ businessName: 'Camera Bazar' });
  });

  it('stores a blank optional from a multipart submit as null, not an empty string', async () => {
    const response = await POST(formRequest({ ...body, businessName: '', fullAddress: '   ' }));

    expect(response.status).toBe(201);
    expect(providerCreate.mock.calls[0][0].data).toMatchObject({ businessName: null, fullAddress: null });
  });

  it('rejects a weak password and a short description before touching the database', async () => {
    const response = await POST(jsonRequest({ ...body, password: 'weak', confirmPassword: 'weak', description: 'short' }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Please correct the highlighted fields.');
    expect(json.fields.password).toBeTruthy();
    expect(json.fields.description).toBeTruthy();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.hashPassword).not.toHaveBeenCalled();
  });

  it('throttles repeated For Rent signups in their own bucket', async () => {
    mocks.consumeRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSeconds: 1800 });

    const response = await POST(jsonRequest(body));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('1800');
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith('signup:rental:ip:203.0.113.10', expect.objectContaining({ limit: 5 }));
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('names the already-taken email without creating anything', async () => {
    mocks.findUnique.mockResolvedValueOnce({ id: 'someone-else' });

    const response = await POST(jsonRequest(body));

    expect(response.status).toBe(409);
    expect((await response.json()).fields).toEqual({ email: ['That email is already in use.'] });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it('names the already-taken mobile number without creating anything', async () => {
    mocks.findUnique.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
      (where.phone ? { id: 'someone-else' } : null));

    const response = await POST(jsonRequest(body));

    expect(response.status).toBe(409);
    expect((await response.json()).fields).toEqual({ phone: ['That mobile number is already in use.'] });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('uploads an optional logo into the new account and stores its url', async () => {
    mocks.uploadLogo.mockResolvedValue({ imageUrl: 'https://cdn.example/logo.jpg', imagePublicId: 'twingface/logo' });
    mocks.providerUpdate.mockResolvedValue({ ...createdProvider, logoUrl: 'https://cdn.example/logo.jpg' });

    const response = await POST(formRequest(body, new File([JPEG_BYTES], 'logo.jpg', { type: 'image/jpeg' })));

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.provider.logoUrl).toBe('https://cdn.example/logo.jpg');
    expect(json.warning).toBeUndefined();
    expect(mocks.uploadLogo).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', kind: 'provider' }));
  });

  it('keeps the account when the logo upload fails and says so', async () => {
    mocks.uploadLogo.mockRejectedValue(new Error('cloudinary down'));

    const response = await POST(formRequest(body, new File([JPEG_BYTES], 'logo.jpg', { type: 'image/jpeg' })));

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.user.accountType).toBe('RENTAL');
    expect(json.warning).toBe('Account created, but the logo upload failed. You can add the logo again later.');
    expect(mocks.providerUpdate).not.toHaveBeenCalled();
    expect(mocks.setSessionCookie).toHaveBeenCalled();
  });

  it('rejects an unreadable logo file before creating the account', async () => {
    const response = await POST(formRequest(body, new File(['not-an-image'], 'logo.jpg', { type: 'image/jpeg' })));

    expect(response.status).toBe(400);
    expect((await response.json()).fields.logo).toBeTruthy();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.uploadLogo).not.toHaveBeenCalled();
  });

  it('retries with a fresh User ID when the suggestion is taken', async () => {
    mocks.suggestedUserId
      .mockReturnValueOnce('jahangir.alam-dup1')
      .mockReturnValueOnce('jahangir.alam-dup2');
    mocks.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing' });

    const response = await POST(jsonRequest(body));

    expect(response.status).toBe(201);
    expect(mocks.suggestedUserId).toHaveBeenCalledTimes(2);
    expect(userCreate.mock.calls[0][0].data.username).toBe('jahangir.alam-dup2');
  });

  it('retries after a username collision race inside the transaction', async () => {
    mocks.suggestedUserId
      .mockReturnValueOnce('jahangir.alam-dup1')
      .mockReturnValueOnce('jahangir.alam-dup2');
    mocks.transaction
      .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: ['username'] },
      }));

    const response = await POST(jsonRequest(body));

    expect(response.status).toBe(201);
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
    expect(userCreate).toHaveBeenCalledTimes(1);
    expect(userCreate.mock.calls[0][0].data.username).toBe('jahangir.alam-dup2');
  });

  it('returns a generic failure when the database is unavailable', async () => {
    mocks.transaction.mockRejectedValue(new Error('connection lost'));

    const response = await POST(jsonRequest(body));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Unable to create your For Rent account. Please try again.' });
  });
});
