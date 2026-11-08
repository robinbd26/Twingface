import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  count: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({
  prisma: { user: { findUnique: mocks.findUnique, update: mocks.update }, rentalListing: { count: mocks.count } },
}));

import { PATCH } from './route';

const admin = { id: 'admin1', name: 'Admin', username: 'root', email: null, profileImage: null, role: 'SUPER_ADMIN' };

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member1',
    name: 'Rafiq Ahmed',
    username: 'rafiq',
    email: 'rafiq@example.com',
    createdAt: new Date('2026-09-20T00:00:00.000Z'),
    accountType: 'RENTAL',
    _count: { professionalIdentities: 0, inquiries: 2 },
    organization: null,
    rentalProvider: { id: 'provider1', businessName: 'Lens House', _count: { listings: 3 } },
    mediaProfile: { id: 'profile1', status: 'PENDING' },
    ...overrides,
  };
}

function callPatch(body: unknown, id = 'member1') {
  return PATCH(
    new Request(`http://localhost/api/mediaworld/admin/accounts/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe('/api/mediaworld/admin/accounts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(admin);
    mocks.findUnique.mockResolvedValue(account());
    mocks.count.mockResolvedValue(0);
    mocks.update.mockResolvedValue({ id: 'member1' });
  });

  it('requires a super admin session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await callPatch({ accountType: 'PROFESSIONAL' })).status).toBe(401);

    mocks.getCurrentUser.mockResolvedValue({ ...admin, role: 'USER' });
    expect((await callPatch({ accountType: 'PROFESSIONAL' })).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('refuses to switch a rental provider away from RENTAL while listings are live', async () => {
    mocks.count.mockResolvedValue(2);

    const response = await callPatch({ accountType: 'PROFESSIONAL' });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('2 active rental listing');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('refuses the switch while the provider profile still owns hidden listings', async () => {
    mocks.count.mockResolvedValue(0);
    mocks.findUnique.mockResolvedValue(account({ rentalProvider: { id: 'provider1', businessName: 'Lens House', _count: { listings: 4 } } }));

    const response = await callPatch({ accountType: 'BUSINESS' });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('currently hidden');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('allows the correction once nothing depends on the old type', async () => {
    mocks.findUnique.mockResolvedValue(
      account({ rentalProvider: { id: 'provider1', businessName: 'Lens House', _count: { listings: 0 } } }),
    );

    const response = await callPatch({ accountType: 'PROFESSIONAL' });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: 'member1' }, data: { accountType: 'PROFESSIONAL' } });
    expect((await response.json()).correction).toBe(true);
  });

  it('refuses to strip BUSINESS from an account that owns an organization', async () => {
    mocks.findUnique.mockResolvedValue(
      account({ accountType: 'BUSINESS', organization: { id: 'org1', orgName: 'Studio Light' }, rentalProvider: null }),
    );

    const response = await callPatch({ accountType: 'PROFESSIONAL' });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('organization profile');
  });

  it('refuses to strip PROFESSIONAL from an account with professional identities', async () => {
    mocks.findUnique.mockResolvedValue(
      account({ accountType: 'PROFESSIONAL', _count: { professionalIdentities: 3, inquiries: 0 }, rentalProvider: null }),
    );

    const response = await callPatch({ accountType: 'BUSINESS' });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('3 professional identit');
  });

  it('refuses a correction that changes nothing', async () => {
    const response = await callPatch({ accountType: 'RENTAL' });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('Nothing to correct');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('validates the account type value', async () => {
    const response = await callPatch({ accountType: 'INFLUENCER' });

    expect(response.status).toBe(400);
    expect((await response.json()).fields.accountType).toHaveLength(1);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('returns not found for an unknown or malformed account id', async () => {
    mocks.findUnique.mockResolvedValue(null);
    expect((await callPatch({ accountType: 'RENTAL' })).status).toBe(404);

    expect((await callPatch({ accountType: 'RENTAL' }, '../member')).status).toBe(404);
    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
  });

  it('never returns credentials', async () => {
    const body = await (await callPatch({ accountType: 'PROFESSIONAL' })).json();

    expect(JSON.stringify(body)).not.toMatch(/passwordHash/);
  });
});
