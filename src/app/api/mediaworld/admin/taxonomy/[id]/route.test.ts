import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  $transaction: vi.fn(),
  industry: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
  mainCategory: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  designation: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
  designationCategory: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  userProfessionalIdentity: { count: vi.fn() },
  organization: { count: vi.fn() },
  organizationType: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
  rentalCategory: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
  rentalSubcategory: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  rentalListing: { count: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: mocks.$transaction,
    industry: mocks.industry,
    mainCategory: mocks.mainCategory,
    designation: mocks.designation,
    designationCategory: mocks.designationCategory,
    userProfessionalIdentity: mocks.userProfessionalIdentity,
    organization: mocks.organization,
    organizationType: mocks.organizationType,
    rentalCategory: mocks.rentalCategory,
    rentalSubcategory: mocks.rentalSubcategory,
    rentalListing: mocks.rentalListing,
  },
}));

import { DELETE, PATCH } from './route';

const admin = { id: 'admin1', name: 'Admin', username: 'root', email: null, profileImage: null, role: 'SUPER_ADMIN' };
const node = { id: 'ind1', code: 'FILM', nameEn: 'Film', nameBn: 'চলচ্চিত্র', sortOrder: 1, isActive: true };

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function callPatch(body: unknown, id = 'ind1') {
  const request = new Request(`http://localhost/api/mediaworld/admin/taxonomy/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return PATCH(request, context(id));
}

function callDelete(id = 'ind1', entity = 'INDUSTRY') {
  const suffix = entity ? `?entity=${encodeURIComponent(entity)}` : '';
  const request = new Request(`http://localhost/api/mediaworld/admin/taxonomy/${encodeURIComponent(id)}${suffix}`, { method: 'DELETE' });
  return DELETE(request, context(id));
}

describe('mediaworld admin taxonomy mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(admin);
    mocks.$transaction.mockResolvedValue([]);
    mocks.userProfessionalIdentity.count.mockResolvedValue(0);
    mocks.designationCategory.count.mockResolvedValue(0);
    mocks.mainCategory.count.mockResolvedValue(0);
    mocks.rentalListing.count.mockResolvedValue(0);
    mocks.rentalSubcategory.count.mockResolvedValue(0);
    mocks.organization.count.mockResolvedValue(0);
  });

  it('refuses anonymous and non-admin callers before touching the database', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await callDelete()).status).toBe(401);
    expect((await callPatch({ entity: 'INDUSTRY', nameEn: 'Television' })).status).toBe(401);

    mocks.getCurrentUser.mockResolvedValue({ ...admin, role: 'USER' });
    expect((await callDelete()).status).toBe(403);
    expect((await callPatch({ entity: 'INDUSTRY', nameEn: 'Television' })).status).toBe(403);

    expect(mocks.industry.delete).not.toHaveBeenCalled();
    expect(mocks.industry.update).not.toHaveBeenCalled();
  });

  it('refuses a hard delete while professional identities still reference the node', async () => {
    mocks.userProfessionalIdentity.count.mockResolvedValue(4);

    const response = await callDelete();
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain('deactivate');
    expect(body.error).toContain('4 professional identities');
    expect(mocks.industry.delete).not.toHaveBeenCalled();
    expect(mocks.industry.findUnique).not.toHaveBeenCalled();
  });

  it('refuses a hard delete while child rows still exist under the node', async () => {
    mocks.mainCategory.count.mockResolvedValue(2);

    const response = await callDelete();

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('2 main categories');
    expect(mocks.industry.delete).not.toHaveBeenCalled();
  });

  it('deletes only when nothing references the node', async () => {
    mocks.industry.findUnique.mockResolvedValue({ id: 'ind1' });
    mocks.industry.delete.mockResolvedValue({ id: 'ind1' });

    const response = await callDelete();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true, id: 'ind1' });
    expect(mocks.industry.delete).toHaveBeenCalledWith({ where: { id: 'ind1' } });
  });

  it('requires the caller to name which entity type is being deleted', async () => {
    const response = await callDelete('ind1', '');

    expect(response.status).toBe(400);
    expect(Object.keys((await response.json()).fields)).toEqual(['entity']);
    expect(mocks.industry.delete).not.toHaveBeenCalled();
  });

  it('ignores malformed node ids', async () => {
    const response = await callDelete('../evil');

    expect(response.status).toBe(404);
    expect(mocks.userProfessionalIdentity.count).not.toHaveBeenCalled();
  });

  it('renames a node without touching its active flag', async () => {
    mocks.industry.findUnique.mockResolvedValue({ id: 'ind1' });
    mocks.industry.update.mockResolvedValue({ ...node, nameEn: 'Television' });

    const response = await callPatch({ entity: 'INDUSTRY', nameEn: 'Television' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.industry.update).toHaveBeenCalledWith({ where: { id: 'ind1' }, data: { nameEn: 'Television' } });
    expect(body.node.nameEn).toBe('Television');
    expect(body.node.references).toEqual({ identities: 0, mainCategories: 0 });
  });

  it('rejects a patch that carries no changes', async () => {
    const response = await callPatch({ entity: 'INDUSTRY' });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Nothing to update.');
    expect(mocks.industry.findUnique).not.toHaveBeenCalled();
  });

  it('refuses to move a main category that active identities already use', async () => {
    mocks.mainCategory.findUnique.mockResolvedValue({ id: 'mc1', industryId: 'ind1' });
    mocks.industry.findUnique.mockResolvedValue({ id: 'ind2', isActive: true });
    mocks.userProfessionalIdentity.count.mockResolvedValue(3);

    const response = await callPatch({ entity: 'MAIN_CATEGORY', industryId: 'ind2' }, 'mc1');

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('3 professional identities');
    expect(mocks.mainCategory.update).not.toHaveBeenCalled();
  });

  it('moves an unreferenced main category and refuses to move it under a deactivated industry', async () => {
    mocks.mainCategory.findUnique.mockResolvedValue({ id: 'mc1', industryId: 'ind1' });
    mocks.industry.findUnique.mockResolvedValue({ id: 'ind2', isActive: true });
    mocks.mainCategory.update.mockResolvedValue({ ...node, id: 'mc1', industryId: 'ind2' });

    const moved = await callPatch({ entity: 'MAIN_CATEGORY', industryId: 'ind2' }, 'mc1');
    expect(moved.status).toBe(200);
    expect(mocks.mainCategory.update).toHaveBeenCalledWith({ where: { id: 'mc1' }, data: { industryId: 'ind2' } });

    mocks.industry.findUnique.mockResolvedValue({ id: 'ind3', isActive: false });
    const blocked = await callPatch({ entity: 'MAIN_CATEGORY', industryId: 'ind3' }, 'mc1');
    expect(blocked.status).toBe(400);
    expect((await blocked.json()).fields.industryId[0]).toContain('deactivated');
  });

  it('rejects a move to the industry a category already belongs to', async () => {
    mocks.mainCategory.findUnique.mockResolvedValue({ id: 'mc1', industryId: 'ind1' });

    const response = await callPatch({ entity: 'MAIN_CATEGORY', industryId: 'ind1' }, 'mc1');

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Nothing to update.');
    expect(mocks.mainCategory.update).not.toHaveBeenCalled();
  });

  it('replaces designation category links in one transaction', async () => {
    const designationNode = { id: 'des1', code: 'DIRECTOR', nameEn: 'Director', nameBn: 'পরিচালক', sortOrder: 0, isActive: true };
    mocks.designation.findUnique.mockResolvedValue({ id: 'des1' });
    mocks.designation.findUniqueOrThrow.mockResolvedValue(designationNode);
    mocks.mainCategory.findMany.mockResolvedValue([{ id: 'cat1' }, { id: 'cat2' }]);
    mocks.designationCategory.findMany.mockResolvedValue([{ categoryId: 'cat1' }, { categoryId: 'cat2' }]);

    const response = await callPatch({ entity: 'DESIGNATION', categoryIds: ['cat1', 'cat2'] }, 'des1');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.$transaction).toHaveBeenCalledTimes(1);
    const [operations] = mocks.$transaction.mock.calls[0] as [unknown[], unknown];
    expect(operations).toHaveLength(2);
    expect(body.node.categoryIds).toEqual(['cat1', 'cat2']);
    expect(mocks.designation.update).not.toHaveBeenCalled();
  });

  it('keeps at least one category link on a designation that members already use', async () => {
    mocks.designation.findUnique.mockResolvedValue({ id: 'des1' });
    mocks.userProfessionalIdentity.count.mockResolvedValue(2);

    const response = await callPatch({ entity: 'DESIGNATION', categoryIds: [] }, 'des1');

    expect(response.status).toBe(409);
    expect(mocks.$transaction).not.toHaveBeenCalled();
    expect((await response.json()).error).toContain('Keep at least one category link');
  });

  it('refuses designation links that point at unknown categories', async () => {
    mocks.designation.findUnique.mockResolvedValue({ id: 'des1' });
    mocks.mainCategory.findMany.mockResolvedValue([{ id: 'cat1' }]);

    const response = await callPatch({ entity: 'DESIGNATION', categoryIds: ['cat1', 'ghost'] }, 'des1');

    expect(response.status).toBe(400);
    expect((await response.json()).fields.categoryIds).toHaveLength(1);
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });

  it('deactivates a rental category that still holds listings', async () => {
    const rentalNode = { id: 'rc1', code: 'CAMERA', nameEn: 'Camera', nameBn: 'ক্যামেরা', sortOrder: 0, isActive: false };
    mocks.rentalCategory.findUnique.mockResolvedValue({ id: 'rc1' });
    mocks.rentalCategory.update.mockResolvedValue(rentalNode);
    mocks.rentalListing.count.mockResolvedValue(7);

    const response = await callPatch({ entity: 'RENTAL_CATEGORY', isActive: false }, 'rc1');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.node.isActive).toBe(false);
    expect(body.node.references).toEqual({ listings: 7, subcategories: 0 });
  });

  it('blocks deleting a rental category that still has listings', async () => {
    mocks.rentalListing.count.mockResolvedValue(7);

    const response = await callDelete('rc1', 'RENTAL_CATEGORY');

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('7 rental listings');
    expect(mocks.rentalCategory.delete).not.toHaveBeenCalled();
  });
});
