import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  industry: { findMany: vi.fn() },
  mainCategory: { findMany: vi.fn() },
  designation: { findMany: vi.fn() },
  organizationType: { findMany: vi.fn() },
  rentalCategory: { findMany: vi.fn() },
  rentalSubcategory: { findMany: vi.fn() },
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    industry: mocks.industry,
    mainCategory: mocks.mainCategory,
    designation: mocks.designation,
    organizationType: mocks.organizationType,
    rentalCategory: mocks.rentalCategory,
    rentalSubcategory: mocks.rentalSubcategory,
  },
}));

import {
  accountTypeChangeBlockers,
  adminAccountWhere,
  AdminAccountQuerySchema,
  adminListingWhere,
  type AccountSnapshot,
  canMoveReportStatus,
  getAdminTaxonomy,
  hasTaxonomyReferences,
  hasTaxonomyUpdate,
  isAdminId,
  parseAdminListingQuery,
  taxonomyDeletionErrorMessage,
  TaxonomyCreateSchema,
  TaxonomyUpdateSchema,
} from './admin';

const snapshot = (overrides: Partial<AccountSnapshot> = {}): AccountSnapshot => ({
  currentType: 'RENTAL',
  identityCount: 0,
  hasOrganization: false,
  providerId: 'provider1',
  activeListings: 0,
  totalListings: 0,
  mediaProfileStatus: null,
  ...overrides,
});

describe('admin taxonomy guards', () => {
  it('only treats non-zero reference counts as blocking', () => {
    expect(hasTaxonomyReferences({ identities: 0, mainCategories: 0 })).toBe(false);
    expect(hasTaxonomyReferences({ identities: 0, listings: 3 })).toBe(true);
  });

  it('tells the admin to deactivate instead of deleting', () => {
    const message = taxonomyDeletionErrorMessage('INDUSTRY', { identities: 4, mainCategories: 2, listings: 0 });

    expect(message).toContain('4 professional identities');
    expect(message).toContain('2 main categories');
    expect(message).not.toContain('0 rental listings');
    expect(message).toContain('deactivate');
  });

  it('names each entity it refuses to delete', () => {
    expect(taxonomyDeletionErrorMessage('ORGANIZATION_TYPE', { organizations: 1 })).toContain('Organization type');
    expect(taxonomyDeletionErrorMessage('RENTAL_SUBCATEGORY', { listings: 9 })).toContain('Rental subcategory');
  });

  it('detects whether a patch carries an actual change', () => {
    expect(hasTaxonomyUpdate(TaxonomyUpdateSchema.parse({ entity: 'INDUSTRY' }))).toBe(false);
    expect(hasTaxonomyUpdate(TaxonomyUpdateSchema.parse({ entity: 'INDUSTRY', isActive: false }))).toBe(true);
    expect(hasTaxonomyUpdate(TaxonomyUpdateSchema.parse({ entity: 'DESIGNATION', categoryIds: [] }))).toBe(true);
  });

  it('normalises codes to upper case and rejects unusable ones', () => {
    const created = TaxonomyCreateSchema.parse({ entity: 'INDUSTRY', code: 'film_tv', nameEn: 'Film & TV', nameBn: 'চলচ্চিত্র' });
    expect(created.code).toBe('FILM_TV');
    expect(created.sortOrder).toBe(0);

    expect(TaxonomyCreateSchema.safeParse({ entity: 'INDUSTRY', code: 'a b', nameEn: 'Ab', nameBn: 'অব' }).success).toBe(false);
    expect(TaxonomyCreateSchema.safeParse({ entity: 'MAIN_CATEGORY', code: 'OK', nameEn: 'Camera', nameBn: 'ক্যামেরা' }).success).toBe(false);
  });

  it('enforces the per-entity column limits so the database never rejects a write', () => {
    expect(TaxonomyCreateSchema.safeParse({ entity: 'INDUSTRY', code: 'FILM', nameEn: 'N'.repeat(81), nameBn: 'চলচ্চিত্র' }).success).toBe(false);
    expect(TaxonomyCreateSchema.safeParse({ entity: 'RENTAL_SUBCATEGORY', code: 'SLR', nameEn: 'N'.repeat(120), nameBn: 'সিনেমা বডি', categoryId: 'rc1' }).success).toBe(true);
    expect(TaxonomyCreateSchema.safeParse({ entity: 'RENTAL_SUBCATEGORY', code: 'SLR', nameEn: 'Cinema bodies', nameBn: 'সিনেমা বডি' }).success).toBe(false);
  });

  it('rejects updates for an unknown entity type', () => {
    expect(TaxonomyUpdateSchema.safeParse({ entity: 'BOOKING_TYPE', isActive: false }).success).toBe(false);
  });

  it('accepts only cuid-shaped node ids', () => {
    expect(isAdminId('ckx2abc123')).toBe(true);
    expect(isAdminId('ckx2-abc')).toBe(false);
    expect(isAdminId('../etc')).toBe(false);
    expect(isAdminId('')).toBe(false);
    expect(isAdminId(null)).toBe(false);
  });
});

describe('admin taxonomy read model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.industry.findMany.mockResolvedValue([{ id: 'ind1', code: 'FILM', nameEn: 'Film', nameBn: 'চলচ্চিত্র', sortOrder: 0, isActive: true, _count: { identities: 5, categories: 2 } }]);
    mocks.mainCategory.findMany.mockResolvedValue([{ id: 'mc1', code: 'CAMERA', nameEn: 'Camera', nameBn: 'ক্যামেরা', sortOrder: 0, isActive: true, industryId: 'ind1', _count: { identities: 1, designations: 3 } }]);
    mocks.designation.findMany.mockResolvedValue([{ id: 'des1', code: 'DIRECTOR', nameEn: 'Director', nameBn: 'পরিচালক', sortOrder: 0, isActive: false, categories: [{ categoryId: 'mc1' }], _count: { identities: 2, categories: 1 } }]);
    mocks.organizationType.findMany.mockResolvedValue([{ id: 'ot1', code: 'PRODUCTION_HOUSE', nameEn: 'Production house', nameBn: 'প্রোডাকশন', sortOrder: 0, isActive: true, isCustom: false, _count: { organizations: 4 } }]);
    mocks.rentalCategory.findMany.mockResolvedValue([{ id: 'rc1', code: 'CAMERA', nameEn: 'Camera', nameBn: 'ক্যামেরা', sortOrder: 0, isActive: true, _count: { listings: 8, subcategories: 2 } }]);
    mocks.rentalSubcategory.findMany.mockResolvedValue([{ id: 'rs1', code: 'CINEMA', nameEn: 'Cinema bodies', nameBn: 'সিনেমা', sortOrder: 0, isActive: true, categoryId: 'rc1', _count: { listings: 6 } }]);
  });

  it('returns every entity with the reference counts the delete guard uses', async () => {
    const tree = await getAdminTaxonomy();

    expect(tree.INDUSTRY[0].references).toEqual({ identities: 5, mainCategories: 2 });
    expect(tree.MAIN_CATEGORY[0].parentId).toBe('ind1');
    expect(tree.MAIN_CATEGORY[0].references).toEqual({ identities: 1, designationLinks: 3 });
    expect(tree.DESIGNATION[0].categoryIds).toEqual(['mc1']);
    expect(tree.DESIGNATION[0].isActive).toBe(false);
    expect(tree.DESIGNATION[0].references).toEqual({ identities: 2, designationLinks: 1 });
    expect(tree.ORGANIZATION_TYPE[0].isCustom).toBe(false);
    expect(tree.ORGANIZATION_TYPE[0].references).toEqual({ organizations: 4 });
    expect(tree.RENTAL_CATEGORY[0].references).toEqual({ listings: 8, subcategories: 2 });
    expect(tree.RENTAL_SUBCATEGORY[0]).toMatchObject({ parentId: 'rc1', references: { listings: 6 } });
  });
});

describe('admin moderation rules', () => {
  it('walks report statuses forward only', () => {
    expect(canMoveReportStatus('OPEN', 'IN_REVIEW')).toBe(true);
    expect(canMoveReportStatus('OPEN', 'RESOLVED')).toBe(true);
    expect(canMoveReportStatus('OPEN', 'DISMISSED')).toBe(true);
    expect(canMoveReportStatus('IN_REVIEW', 'OPEN')).toBe(false);
    expect(canMoveReportStatus('IN_REVIEW', 'IN_REVIEW')).toBe(false);
    expect(canMoveReportStatus('RESOLVED', 'OPEN')).toBe(false);
    expect(canMoveReportStatus('DISMISSED', 'IN_REVIEW')).toBe(false);
  });

  it('builds the listing queue filters per view', () => {
    const base = { view: 'ALL' as const, limit: 30 };

    expect(adminListingWhere(base)).toEqual({});
    expect(adminListingWhere({ ...base, view: 'ACTIVE' })).toEqual({ isActive: true });
    expect(adminListingWhere({ ...base, view: 'HIDDEN', categoryId: 'rc1' })).toEqual({ isActive: false, categoryId: 'rc1' });
    expect(adminListingWhere({ ...base, query: 'camera' })).toEqual({
      OR: [{ title: { contains: 'camera', mode: 'insensitive' } }, { location: { contains: 'camera', mode: 'insensitive' } }],
    });
  });

  it('treats empty query-string values as “not filtered”', () => {
    const parsed = parseAdminListingQuery(new URLSearchParams('view=&availability=&q=&limit=&cursor='));

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.view).toBe('ALL');
      expect(parsed.data.limit).toBe(30);
      expect(parsed.data.query).toBeUndefined();
    }

    expect(parseAdminListingQuery(new URLSearchParams('limit=999')).success).toBe(false);
    expect(parseAdminListingQuery(new URLSearchParams('availability=SOLD_OUT')).success).toBe(false);
  });

  it('scopes the account overview to Media World accounts', () => {
    const defaults = AdminAccountQuerySchema.parse({});

    expect(adminAccountWhere(defaults)).toEqual({ accountType: { not: null } });
    expect(adminAccountWhere({ ...defaults, type: 'RENTAL' })).toEqual({ accountType: 'RENTAL' });
    expect(adminAccountWhere({ ...defaults, query: 'rafiq' })).toEqual({
      accountType: { not: null },
      OR: [{ name: { contains: 'rafiq', mode: 'insensitive' } }, { username: { contains: 'rafiq', mode: 'insensitive' } }],
    });
  });
});

describe('account type correction guards', () => {
  it('refuses to change a type that already matches', () => {
    expect(accountTypeChangeBlockers('RENTAL', snapshot())).toEqual(['The account is already set to RENTAL. Nothing to correct.']);
  });

  it('refuses to drop RENTAL while listings are live', () => {
    const blockers = accountTypeChangeBlockers('PROFESSIONAL', snapshot({ activeListings: 2, totalListings: 2 }));

    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toContain('2 active rental listing');
  });

  it('refuses to drop RENTAL while a provider profile still owns hidden listings', () => {
    const blockers = accountTypeChangeBlockers('BUSINESS', snapshot({ totalListings: 5 }));

    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toContain('currently hidden');
  });

  it('refuses to drop BUSINESS while an organization profile exists', () => {
    expect(accountTypeChangeBlockers('PROFESSIONAL', snapshot({ currentType: 'BUSINESS', hasOrganization: true, providerId: null }))).toHaveLength(1);
  });

  it('refuses to drop PROFESSIONAL while identities exist', () => {
    expect(accountTypeChangeBlockers('BUSINESS', snapshot({ currentType: 'PROFESSIONAL', identityCount: 2, providerId: null }))).toHaveLength(1);
  });

  it('allows correcting an account that has no type yet', () => {
    expect(accountTypeChangeBlockers('RENTAL', snapshot({ currentType: null, providerId: null }))).toEqual([]);
  });

  it('allows the switch once nothing depends on the old type', () => {
    expect(accountTypeChangeBlockers('PROFESSIONAL', snapshot({ providerId: null }))).toEqual([]);
  });
});
