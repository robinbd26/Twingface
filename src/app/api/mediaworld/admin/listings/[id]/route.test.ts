import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { rentalListing: { findUnique: mocks.findUnique, update: mocks.update } } }));

import { DELETE, PATCH } from './route';

const admin = { id: 'admin1', name: 'Admin', username: 'root', email: null, profileImage: null, role: 'SUPER_ADMIN' };

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function callPatch(body: unknown, id = 'listing1') {
  return PATCH(
    new Request(`http://localhost/api/mediaworld/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    context(id),
  );
}

const card = {
  id: 'listing1',
  title: 'Sony FX3 cinema camera',
  isActive: false,
  providerId: 'provider1',
  category: { id: 'cat1', code: 'CAMERA', nameEn: 'Camera', nameBn: 'ক্যামেরা' },
  subcategory: null,
  provider: { id: 'provider1', businessName: 'Lens House', ownerName: 'Rafiq', location: 'Dhaka', logoUrl: null },
  photos: [],
};

describe('/api/mediaworld/admin/listings/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(admin);
    mocks.findUnique.mockResolvedValue({ id: 'listing1', isActive: true });
    mocks.update.mockResolvedValue(card);
  });

  it('requires a super admin session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await callPatch({ action: 'hide' })).status).toBe(401);
    expect((await DELETE()).status).toBe(401);

    mocks.getCurrentUser.mockResolvedValue({ ...admin, role: 'USER' });
    expect((await callPatch({ action: 'hide' })).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('hides a visible listing for every provider', async () => {
    const response = await callPatch({ action: 'hide' });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'listing1' }, data: { isActive: false } }));
  });

  it('restores a hidden listing', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'listing1', isActive: false });

    const response = await callPatch({ action: 'restore' });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: { isActive: true } }));
  });

  it('refuses a no-op action instead of rewriting the row', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'listing1', isActive: false });

    const response = await callPatch({ action: 'hide' });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Listing is already hidden.');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('rejects actions that are not hide or restore', async () => {
    const response = await callPatch({ action: 'delete' });

    expect(response.status).toBe(400);
    expect((await response.json()).fields.action).toHaveLength(1);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('never deletes a listing from the admin panel', async () => {
    const response = await DELETE();

    expect(response.status).toBe(405);
    expect((await response.json()).error).toContain('Hide the listing instead');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('returns not found for a missing listing', async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await callPatch({ action: 'hide' });

    expect(response.status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
