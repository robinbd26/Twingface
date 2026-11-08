import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { rentalListingCardSelect, RENTAL_AVAILABILITY_VALUES } from './rental';
import { MediaAccountTypeSchema } from '@/lib/mediaworld/validations';

export const ADMIN_ID_PATTERN = /^[a-z0-9]{1,40}$/i;

export function isAdminId(value: string | undefined | null): boolean {
  return typeof value === 'string' && ADMIN_ID_PATTERN.test(value);
}

export type AdminMutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; fields?: Record<string, string[]> };

export function adminFailure(status: number, error: string, fields?: Record<string, string[]>): NextResponse {
  return NextResponse.json(fields && Object.keys(fields).length > 0 ? { error, fields } : { error }, { status });
}

export const TAXONOMY_ENTITY_VALUES = [
  'INDUSTRY',
  'MAIN_CATEGORY',
  'DESIGNATION',
  'ORGANIZATION_TYPE',
  'RENTAL_CATEGORY',
  'RENTAL_SUBCATEGORY',
] as const;
export type TaxonomyEntity = (typeof TAXONOMY_ENTITY_VALUES)[number];

export const TaxonomyEntitySchema = z.enum(TAXONOMY_ENTITY_VALUES);

export const ADMIN_TAXONOMY_LABELS: Record<TaxonomyEntity, string> = {
  INDUSTRY: 'Industry',
  MAIN_CATEGORY: 'Main category',
  DESIGNATION: 'Designation',
  ORGANIZATION_TYPE: 'Organization type',
  RENTAL_CATEGORY: 'Rental category',
  RENTAL_SUBCATEGORY: 'Rental subcategory',
};

const REFERENCE_LABELS: Record<string, string> = {
  identities: 'professional identities',
  mainCategories: 'main categories',
  designationLinks: 'designation links',
  organizations: 'organizations',
  listings: 'rental listings',
  subcategories: 'rental subcategories',
};

const ENTITY_LIMITS: Record<TaxonomyEntity, { code: number; name: number }> = {
  INDUSTRY: { code: 30, name: 80 },
  MAIN_CATEGORY: { code: 40, name: 100 },
  DESIGNATION: { code: 60, name: 120 },
  ORGANIZATION_TYPE: { code: 60, name: 120 },
  RENTAL_CATEGORY: { code: 30, name: 100 },
  RENTAL_SUBCATEGORY: { code: 40, name: 120 },
};

const ADMIN_DEFAULT_LIMIT = 30;
const ADMIN_MAX_LIMIT = 100;

function codeField(entity: TaxonomyEntity) {
  const max = ENTITY_LIMITS[entity].code;
  return z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine(
      (value) => value.length >= 2 && value.length <= max && /^[A-Z0-9][A-Z0-9_]*$/.test(value),
      `Code must be 2-${max} characters: letters, numbers or underscores.`,
    );
}

function nameField(entity: TaxonomyEntity, label: 'English name' | 'Bangla name') {
  const max = ENTITY_LIMITS[entity].name;
  return z.string().trim().min(2, `${label} must be at least 2 characters.`).max(max, `${label} must be ${max} characters or fewer.`);
}

const optionalNameField = (entity: TaxonomyEntity, label: 'English name' | 'Bangla name') => nameField(entity, label).optional();
const parentId = (label: string) => z.string().trim().min(1, `${label} is required.`).max(40);
const sortOrderField = z.coerce.number().int('Sort order must be a whole number.').min(0).max(9999);
const optionalSortOrderField = sortOrderField.optional();
const optionalActiveField = z.boolean().optional();
const idList = (label: string) => z.array(parentId(label)).max(80);

export const TaxonomyCreateSchema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('INDUSTRY'),
    code: codeField('INDUSTRY'),
    nameEn: nameField('INDUSTRY', 'English name'),
    nameBn: nameField('INDUSTRY', 'Bangla name'),
    sortOrder: sortOrderField.default(0),
  }),
  z.object({
    entity: z.literal('MAIN_CATEGORY'),
    code: codeField('MAIN_CATEGORY'),
    nameEn: nameField('MAIN_CATEGORY', 'English name'),
    nameBn: nameField('MAIN_CATEGORY', 'Bangla name'),
    sortOrder: sortOrderField.default(0),
    industryId: parentId('Industry'),
  }),
  z.object({
    entity: z.literal('DESIGNATION'),
    code: codeField('DESIGNATION'),
    nameEn: nameField('DESIGNATION', 'English name'),
    nameBn: nameField('DESIGNATION', 'Bangla name'),
    sortOrder: sortOrderField.default(0),
    categoryIds: idList('Category').optional(),
  }),
  z.object({
    entity: z.literal('ORGANIZATION_TYPE'),
    code: codeField('ORGANIZATION_TYPE'),
    nameEn: nameField('ORGANIZATION_TYPE', 'English name'),
    nameBn: nameField('ORGANIZATION_TYPE', 'Bangla name'),
    sortOrder: sortOrderField.default(0),
    isCustom: z.boolean().optional(),
  }),
  z.object({
    entity: z.literal('RENTAL_CATEGORY'),
    code: codeField('RENTAL_CATEGORY'),
    nameEn: nameField('RENTAL_CATEGORY', 'English name'),
    nameBn: nameField('RENTAL_CATEGORY', 'Bangla name'),
    sortOrder: sortOrderField.default(0),
  }),
  z.object({
    entity: z.literal('RENTAL_SUBCATEGORY'),
    code: codeField('RENTAL_SUBCATEGORY'),
    nameEn: nameField('RENTAL_SUBCATEGORY', 'English name'),
    nameBn: nameField('RENTAL_SUBCATEGORY', 'Bangla name'),
    sortOrder: sortOrderField.default(0),
    categoryId: parentId('Rental category'),
  }),
]);
export type TaxonomyCreateInput = z.infer<typeof TaxonomyCreateSchema>;

export const TaxonomyUpdateSchema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('INDUSTRY'),
    nameEn: optionalNameField('INDUSTRY', 'English name'),
    nameBn: optionalNameField('INDUSTRY', 'Bangla name'),
    sortOrder: optionalSortOrderField,
    isActive: optionalActiveField,
  }),
  z.object({
    entity: z.literal('MAIN_CATEGORY'),
    nameEn: optionalNameField('MAIN_CATEGORY', 'English name'),
    nameBn: optionalNameField('MAIN_CATEGORY', 'Bangla name'),
    sortOrder: optionalSortOrderField,
    isActive: optionalActiveField,
    industryId: parentId('Industry').optional(),
  }),
  z.object({
    entity: z.literal('DESIGNATION'),
    nameEn: optionalNameField('DESIGNATION', 'English name'),
    nameBn: optionalNameField('DESIGNATION', 'Bangla name'),
    sortOrder: optionalSortOrderField,
    isActive: optionalActiveField,
    categoryIds: idList('Category').optional(),
  }),
  z.object({
    entity: z.literal('ORGANIZATION_TYPE'),
    nameEn: optionalNameField('ORGANIZATION_TYPE', 'English name'),
    nameBn: optionalNameField('ORGANIZATION_TYPE', 'Bangla name'),
    sortOrder: optionalSortOrderField,
    isActive: optionalActiveField,
    isCustom: z.boolean().optional(),
  }),
  z.object({
    entity: z.literal('RENTAL_CATEGORY'),
    nameEn: optionalNameField('RENTAL_CATEGORY', 'English name'),
    nameBn: optionalNameField('RENTAL_CATEGORY', 'Bangla name'),
    sortOrder: optionalSortOrderField,
    isActive: optionalActiveField,
  }),
  z.object({
    entity: z.literal('RENTAL_SUBCATEGORY'),
    nameEn: optionalNameField('RENTAL_SUBCATEGORY', 'English name'),
    nameBn: optionalNameField('RENTAL_SUBCATEGORY', 'Bangla name'),
    sortOrder: optionalSortOrderField,
    isActive: optionalActiveField,
  }),
]);
export type TaxonomyUpdateInput = z.infer<typeof TaxonomyUpdateSchema>;

const UPDATE_KEYS = ['nameEn', 'nameBn', 'sortOrder', 'isActive', 'industryId', 'categoryIds', 'isCustom'] as const;

export function hasTaxonomyUpdate(input: TaxonomyUpdateInput): boolean {
  const record = input as Record<string, unknown>;
  return UPDATE_KEYS.some((key) => record[key] !== undefined);
}

export type AdminTaxonomyNode = {
  id: string;
  entity: TaxonomyEntity;
  code: string;
  nameEn: string;
  nameBn: string;
  sortOrder: number;
  isActive: boolean;
  isCustom?: boolean;
  parentId: string | null;
  categoryIds?: string[];
  references?: Record<string, number>;
};

export type AdminTaxonomyTree = Record<TaxonomyEntity, AdminTaxonomyNode[]>;

const NODE_ORDER: Prisma.IndustryOrderByWithRelationInput[] = [{ sortOrder: 'asc' }, { code: 'asc' }];

export async function getAdminTaxonomy(): Promise<AdminTaxonomyTree> {
  const [industries, mainCategories, designations, organizationTypes, rentalCategories, rentalSubcategories] = await Promise.all([
    prisma.industry.findMany({
      orderBy: NODE_ORDER,
      select: { id: true, code: true, nameEn: true, nameBn: true, sortOrder: true, isActive: true, _count: { select: { identities: true, categories: true } } },
    }),
    prisma.mainCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: { id: true, code: true, nameEn: true, nameBn: true, sortOrder: true, isActive: true, industryId: true, _count: { select: { identities: true, designations: true } } },
    }),
    prisma.designation.findMany({
      orderBy: NODE_ORDER,
      select: { id: true, code: true, nameEn: true, nameBn: true, sortOrder: true, isActive: true, categories: { select: { categoryId: true } }, _count: { select: { identities: true, categories: true } } },
    }),
    prisma.organizationType.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: { id: true, code: true, nameEn: true, nameBn: true, sortOrder: true, isActive: true, isCustom: true, _count: { select: { organizations: true } } },
    }),
    prisma.rentalCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: { id: true, code: true, nameEn: true, nameBn: true, sortOrder: true, isActive: true, _count: { select: { listings: true, subcategories: true } } },
    }),
    prisma.rentalSubcategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: { id: true, code: true, nameEn: true, nameBn: true, sortOrder: true, isActive: true, categoryId: true, _count: { select: { listings: true } } },
    }),
  ]);

  return {
    INDUSTRY: industries.map((node) => ({
      id: node.id,
      entity: 'INDUSTRY' as const,
      code: node.code,
      nameEn: node.nameEn,
      nameBn: node.nameBn,
      sortOrder: node.sortOrder,
      isActive: node.isActive,
      parentId: null,
      references: { identities: node._count.identities, mainCategories: node._count.categories },
    })),
    MAIN_CATEGORY: mainCategories.map((node) => ({
      id: node.id,
      entity: 'MAIN_CATEGORY' as const,
      code: node.code,
      nameEn: node.nameEn,
      nameBn: node.nameBn,
      sortOrder: node.sortOrder,
      isActive: node.isActive,
      parentId: node.industryId,
      references: { identities: node._count.identities, designationLinks: node._count.designations },
    })),
    DESIGNATION: designations.map((node) => ({
      id: node.id,
      entity: 'DESIGNATION' as const,
      code: node.code,
      nameEn: node.nameEn,
      nameBn: node.nameBn,
      sortOrder: node.sortOrder,
      isActive: node.isActive,
      parentId: null,
      categoryIds: node.categories.map((link) => link.categoryId),
      references: { identities: node._count.identities, designationLinks: node._count.categories },
    })),
    ORGANIZATION_TYPE: organizationTypes.map((node) => ({
      id: node.id,
      entity: 'ORGANIZATION_TYPE' as const,
      code: node.code,
      nameEn: node.nameEn,
      nameBn: node.nameBn,
      sortOrder: node.sortOrder,
      isActive: node.isActive,
      isCustom: node.isCustom,
      parentId: null,
      references: { organizations: node._count.organizations },
    })),
    RENTAL_CATEGORY: rentalCategories.map((node) => ({
      id: node.id,
      entity: 'RENTAL_CATEGORY' as const,
      code: node.code,
      nameEn: node.nameEn,
      nameBn: node.nameBn,
      sortOrder: node.sortOrder,
      isActive: node.isActive,
      parentId: null,
      references: { listings: node._count.listings, subcategories: node._count.subcategories },
    })),
    RENTAL_SUBCATEGORY: rentalSubcategories.map((node) => ({
      id: node.id,
      entity: 'RENTAL_SUBCATEGORY' as const,
      code: node.code,
      nameEn: node.nameEn,
      nameBn: node.nameBn,
      sortOrder: node.sortOrder,
      isActive: node.isActive,
      parentId: node.categoryId,
      references: { listings: node._count.listings },
    })),
  };
}

export async function countTaxonomyReferences(entity: TaxonomyEntity, id: string): Promise<Record<string, number>> {
  switch (entity) {
    case 'INDUSTRY': {
      const [identities, mainCategories] = await Promise.all([
        prisma.userProfessionalIdentity.count({ where: { industryId: id } }),
        prisma.mainCategory.count({ where: { industryId: id } }),
      ]);
      return { identities, mainCategories };
    }
    case 'MAIN_CATEGORY': {
      const [identities, designationLinks] = await Promise.all([
        prisma.userProfessionalIdentity.count({ where: { mainCategoryId: id } }),
        prisma.designationCategory.count({ where: { categoryId: id } }),
      ]);
      return { identities, designationLinks };
    }
    case 'DESIGNATION': {
      const [identities, designationLinks] = await Promise.all([
        prisma.userProfessionalIdentity.count({ where: { designationId: id } }),
        prisma.designationCategory.count({ where: { designationId: id } }),
      ]);
      return { identities, designationLinks };
    }
    case 'ORGANIZATION_TYPE': {
      const organizations = await prisma.organization.count({ where: { orgTypeId: id } });
      return { organizations };
    }
    case 'RENTAL_CATEGORY': {
      const [listings, subcategories] = await Promise.all([
        prisma.rentalListing.count({ where: { categoryId: id } }),
        prisma.rentalSubcategory.count({ where: { categoryId: id } }),
      ]);
      return { listings, subcategories };
    }
    case 'RENTAL_SUBCATEGORY': {
      const listings = await prisma.rentalListing.count({ where: { subcategoryId: id } });
      return { listings };
    }
  }
}

export function hasTaxonomyReferences(references: Record<string, number>): boolean {
  return Object.values(references).some((count) => count > 0);
}

export function taxonomyDeletionErrorMessage(entity: TaxonomyEntity, references: Record<string, number>): string {
  const parts = Object.entries(references)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${count} ${REFERENCE_LABELS[key] ?? key}`);
  const label = ADMIN_TAXONOMY_LABELS[entity];
  return parts.length === 0
    ? `${label} cannot be deleted.`
    : `${label} is still referenced by ${parts.join(' and ')}. Deleting it would break existing member data, so the delete is refused — deactivate it instead: it stays visible on profiles that already use it and disappears from new sign-ups.`;
}

function missingNode(entity: TaxonomyEntity): AdminMutationResult<AdminTaxonomyNode> {
  return { ok: false, status: 404, error: `${ADMIN_TAXONOMY_LABELS[entity]} not found.` };
}

function changedFields(input: { nameEn?: string; nameBn?: string; sortOrder?: number; isActive?: boolean }) {
  const data: Record<string, unknown> = {};
  if (input.nameEn !== undefined) data.nameEn = input.nameEn;
  if (input.nameBn !== undefined) data.nameBn = input.nameBn;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  return data;
}

export async function createTaxonomyNode(input: TaxonomyCreateInput): Promise<AdminMutationResult<AdminTaxonomyNode>> {
  switch (input.entity) {
    case 'INDUSTRY': {
      if (await prisma.industry.findFirst({ where: { code: input.code }, select: { id: true } })) {
        return { ok: false, status: 400, error: 'Please correct the highlighted fields.', fields: { code: ['An industry already uses this code.'] } };
      }
      const node = await prisma.industry.create({ data: { code: input.code, nameEn: input.nameEn, nameBn: input.nameBn, sortOrder: input.sortOrder } });
      return { ok: true, data: { ...nodeBase('INDUSTRY', node), references: { identities: 0, mainCategories: 0 } } };
    }
    case 'MAIN_CATEGORY': {
      const industry = await prisma.industry.findUnique({ where: { id: input.industryId }, select: { id: true } });
      if (!industry) {
        return { ok: false, status: 400, error: 'Please correct the highlighted fields.', fields: { industryId: ['Choose an existing industry.'] } };
      }
      if (await prisma.mainCategory.findFirst({ where: { industryId: industry.id, code: input.code }, select: { id: true } })) {
        return { ok: false, status: 400, error: 'Please correct the highlighted fields.', fields: { code: ['This industry already uses that code.'] } };
      }
      const node = await prisma.mainCategory.create({
        data: { industryId: industry.id, code: input.code, nameEn: input.nameEn, nameBn: input.nameBn, sortOrder: input.sortOrder },
      });
      return { ok: true, data: { ...nodeBase('MAIN_CATEGORY', node), parentId: industry.id, references: { identities: 0, designationLinks: 0 } } };
    }
    case 'DESIGNATION': {
      if (await prisma.designation.findFirst({ where: { code: input.code }, select: { id: true } })) {
        return { ok: false, status: 400, error: 'Please correct the highlighted fields.', fields: { code: ['A designation already uses this code.'] } };
      }
      const categoryIds = input.categoryIds ?? [];
      if (categoryIds.length > 0) {
        const found = await prisma.mainCategory.findMany({ where: { id: { in: categoryIds } }, select: { id: true } });
        if (found.length !== new Set(categoryIds).size) {
          return { ok: false, status: 400, error: 'Please correct the highlighted fields.', fields: { categoryIds: ['One or more categories do not exist.'] } };
        }
      }
      const node = await prisma.designation.create({
        data: {
          code: input.code,
          nameEn: input.nameEn,
          nameBn: input.nameBn,
          sortOrder: input.sortOrder,
          ...(categoryIds.length > 0 ? { categories: { createMany: { data: categoryIds.map((categoryId) => ({ categoryId })) } } } : {}),
        },
      });
      return {
        ok: true,
        data: { ...nodeBase('DESIGNATION', node), categoryIds, references: { identities: 0, designationLinks: categoryIds.length } },
      };
    }
    case 'ORGANIZATION_TYPE': {
      if (await prisma.organizationType.findFirst({ where: { code: input.code }, select: { id: true } })) {
        return { ok: false, status: 400, error: 'Please correct the highlighted fields.', fields: { code: ['An organization type already uses this code.'] } };
      }
      const node = await prisma.organizationType.create({
        data: { code: input.code, nameEn: input.nameEn, nameBn: input.nameBn, sortOrder: input.sortOrder, isCustom: input.isCustom ?? false },
      });
      return { ok: true, data: { ...nodeBase('ORGANIZATION_TYPE', node), isCustom: node.isCustom, references: { organizations: 0 } } };
    }
    case 'RENTAL_CATEGORY': {
      if (await prisma.rentalCategory.findFirst({ where: { code: input.code }, select: { id: true } })) {
        return { ok: false, status: 400, error: 'Please correct the highlighted fields.', fields: { code: ['A rental category already uses this code.'] } };
      }
      const node = await prisma.rentalCategory.create({ data: { code: input.code, nameEn: input.nameEn, nameBn: input.nameBn, sortOrder: input.sortOrder } });
      return { ok: true, data: { ...nodeBase('RENTAL_CATEGORY', node), references: { listings: 0, subcategories: 0 } } };
    }
    case 'RENTAL_SUBCATEGORY': {
      const category = await prisma.rentalCategory.findUnique({ where: { id: input.categoryId }, select: { id: true } });
      if (!category) {
        return { ok: false, status: 400, error: 'Please correct the highlighted fields.', fields: { categoryId: ['Choose an existing rental category.'] } };
      }
      if (await prisma.rentalSubcategory.findFirst({ where: { categoryId: category.id, code: input.code }, select: { id: true } })) {
        return { ok: false, status: 400, error: 'Please correct the highlighted fields.', fields: { code: ['This category already uses that code.'] } };
      }
      const node = await prisma.rentalSubcategory.create({
        data: { categoryId: category.id, code: input.code, nameEn: input.nameEn, nameBn: input.nameBn, sortOrder: input.sortOrder },
      });
      return { ok: true, data: { ...nodeBase('RENTAL_SUBCATEGORY', node), parentId: category.id, references: { listings: 0 } } };
    }
  }
}

function nodeBase(entity: TaxonomyEntity, node: { id: string; code: string; nameEn: string; nameBn: string; sortOrder: number; isActive: boolean }): AdminTaxonomyNode {
  return {
    id: node.id,
    entity,
    code: node.code,
    nameEn: node.nameEn,
    nameBn: node.nameBn,
    sortOrder: node.sortOrder,
    isActive: node.isActive,
    parentId: null,
  };
}

export async function updateTaxonomyNode(input: TaxonomyUpdateInput & { id: string }): Promise<AdminMutationResult<AdminTaxonomyNode>> {
  const { id } = input;

  switch (input.entity) {
    case 'INDUSTRY': {
      const existing = await prisma.industry.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return missingNode('INDUSTRY');
      const node = await prisma.industry.update({ where: { id }, data: changedFields(input) });
      return { ok: true, data: { ...nodeBase('INDUSTRY', node), references: await countTaxonomyReferences('INDUSTRY', id) } };
    }
    case 'MAIN_CATEGORY': {
      const existing = await prisma.mainCategory.findUnique({ where: { id }, select: { id: true, industryId: true } });
      if (!existing) return missingNode('MAIN_CATEGORY');
      const data: Record<string, unknown> = changedFields(input);

      if (input.industryId !== undefined && input.industryId !== existing.industryId) {
        const target = await prisma.industry.findUnique({ where: { id: input.industryId }, select: { id: true, isActive: true } });
        if (!target) {
          return { ok: false, status: 400, error: 'Please correct the highlighted fields.', fields: { industryId: ['Choose an existing industry.'] } };
        }
        if (!target.isActive) {
          return { ok: false, status: 400, error: 'Please correct the highlighted fields.', fields: { industryId: ['That industry is deactivated. Activate it first.'] } };
        }
        const identities = await prisma.userProfessionalIdentity.count({ where: { mainCategoryId: id } });
        if (identities > 0) {
          return {
            ok: false,
            status: 409,
            error: `This category is used by ${identities} professional identities. Moving it to another industry would leave those profiles pointing at the wrong industry, so the move is refused. Deactivate it and create the category under the new industry instead.`,
          };
        }
        data.industryId = target.id;
      }

      if (Object.keys(data).length === 0) {
        return { ok: false, status: 400, error: 'Nothing to update.' };
      }

      const node = await prisma.mainCategory.update({ where: { id }, data });
      return {
        ok: true,
        data: { ...nodeBase('MAIN_CATEGORY', node), parentId: node.industryId, references: await countTaxonomyReferences('MAIN_CATEGORY', id) },
      };
    }
    case 'DESIGNATION': {
      const existing = await prisma.designation.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return missingNode('DESIGNATION');

      if (input.categoryIds !== undefined) {
        const categoryIds = [...new Set(input.categoryIds)];
        if (categoryIds.length > 0) {
          const found = await prisma.mainCategory.findMany({ where: { id: { in: categoryIds } }, select: { id: true } });
          if (found.length !== categoryIds.length) {
            return { ok: false, status: 400, error: 'Please correct the highlighted fields.', fields: { categoryIds: ['One or more categories do not exist.'] } };
          }
        }
        // Join rows are replaced atomically so a designation is never left half-linked.
        const current = await prisma.userProfessionalIdentity.count({ where: { designationId: id } });
        if (categoryIds.length === 0 && current > 0) {
          return {
            ok: false,
            status: 409,
            error: `${current} professional identities use this designation. Keep at least one category link so those profiles stay reachable.`,
          };
        }
        await prisma.$transaction([
          prisma.designationCategory.deleteMany({ where: { designationId: id } }),
          ...(categoryIds.length > 0
            ? [prisma.designationCategory.createMany({ data: categoryIds.map((categoryId) => ({ designationId: id, categoryId })) })]
            : []),
        ]);
      }

      const rest = changedFields(input);
      const node = Object.keys(rest).length > 0 ? await prisma.designation.update({ where: { id }, data: rest }) : await prisma.designation.findUniqueOrThrow({ where: { id } });
      const links = await prisma.designationCategory.findMany({ where: { designationId: id }, select: { categoryId: true } });
      return {
        ok: true,
        data: {
          ...nodeBase('DESIGNATION', node),
          categoryIds: links.map((link) => link.categoryId),
          references: await countTaxonomyReferences('DESIGNATION', id),
        },
      };
    }
    case 'ORGANIZATION_TYPE': {
      const existing = await prisma.organizationType.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return missingNode('ORGANIZATION_TYPE');
      const data: Record<string, unknown> = changedFields(input);
      if (input.isCustom !== undefined) data.isCustom = input.isCustom;
      const node = await prisma.organizationType.update({ where: { id }, data });
      return { ok: true, data: { ...nodeBase('ORGANIZATION_TYPE', node), isCustom: node.isCustom, references: await countTaxonomyReferences('ORGANIZATION_TYPE', id) } };
    }
    case 'RENTAL_CATEGORY': {
      const existing = await prisma.rentalCategory.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return missingNode('RENTAL_CATEGORY');
      const node = await prisma.rentalCategory.update({ where: { id }, data: changedFields(input) });
      return { ok: true, data: { ...nodeBase('RENTAL_CATEGORY', node), references: await countTaxonomyReferences('RENTAL_CATEGORY', id) } };
    }
    case 'RENTAL_SUBCATEGORY': {
      const existing = await prisma.rentalSubcategory.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return missingNode('RENTAL_SUBCATEGORY');
      const node = await prisma.rentalSubcategory.update({ where: { id }, data: changedFields(input) });
      return { ok: true, data: { ...nodeBase('RENTAL_SUBCATEGORY', node), parentId: node.categoryId, references: await countTaxonomyReferences('RENTAL_SUBCATEGORY', id) } };
    }
  }
}

export async function deleteTaxonomyNode(entity: TaxonomyEntity, id: string): Promise<AdminMutationResult<{ id: string }>> {
  const references = await countTaxonomyReferences(entity, id);
  if (hasTaxonomyReferences(references)) {
    return { ok: false, status: 409, error: taxonomyDeletionErrorMessage(entity, references) };
  }

  switch (entity) {
    case 'INDUSTRY': {
      if (!(await prisma.industry.findUnique({ where: { id }, select: { id: true } }))) return missingNode(entity);
      await prisma.industry.delete({ where: { id } });
      break;
    }
    case 'MAIN_CATEGORY': {
      if (!(await prisma.mainCategory.findUnique({ where: { id }, select: { id: true } }))) return missingNode(entity);
      await prisma.mainCategory.delete({ where: { id } });
      break;
    }
    case 'DESIGNATION': {
      if (!(await prisma.designation.findUnique({ where: { id }, select: { id: true } }))) return missingNode(entity);
      await prisma.designation.delete({ where: { id } });
      break;
    }
    case 'ORGANIZATION_TYPE': {
      if (!(await prisma.organizationType.findUnique({ where: { id }, select: { id: true } }))) return missingNode(entity);
      await prisma.organizationType.delete({ where: { id } });
      break;
    }
    case 'RENTAL_CATEGORY': {
      if (!(await prisma.rentalCategory.findUnique({ where: { id }, select: { id: true } }))) return missingNode(entity);
      await prisma.rentalCategory.delete({ where: { id } });
      break;
    }
    case 'RENTAL_SUBCATEGORY': {
      if (!(await prisma.rentalSubcategory.findUnique({ where: { id }, select: { id: true } }))) return missingNode(entity);
      await prisma.rentalSubcategory.delete({ where: { id } });
      break;
    }
  }

  return { ok: true, data: { id } };
}

export const ADMIN_LISTING_VIEWS = ['ALL', 'ACTIVE', 'HIDDEN'] as const;
export const AdminListingQuerySchema = z.object({
  view: z.enum(ADMIN_LISTING_VIEWS).default('ALL'),
  availability: z.enum(RENTAL_AVAILABILITY_VALUES).optional(),
  categoryId: z.string().trim().max(40).optional(),
  query: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(ADMIN_MAX_LIMIT).default(ADMIN_DEFAULT_LIMIT),
  cursor: z.string().trim().min(1).max(40).optional(),
});
export type AdminListingQuery = z.infer<typeof AdminListingQuerySchema>;

export function parseAdminListingQuery(searchParams: URLSearchParams) {
  const value = (key: string) => searchParams.get(key) || undefined;
  return AdminListingQuerySchema.safeParse({
    view: value('view'),
    availability: value('availability'),
    categoryId: value('categoryId'),
    query: value('q'),
    limit: value('limit'),
    cursor: value('cursor'),
  });
}

export function adminListingWhere(input: AdminListingQuery): Prisma.RentalListingWhereInput {
  const search = input.query;
  return {
    ...(input.view === 'ACTIVE' ? { isActive: true } : input.view === 'HIDDEN' ? { isActive: false } : {}),
    ...(input.availability ? { availability: input.availability } : {}),
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    ...(search
      ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { location: { contains: search, mode: 'insensitive' } }] }
      : {}),
  };
}

export const adminRentalListingSelect = {
  ...rentalListingCardSelect,
  _count: { select: { inquiries: true, reports: true } },
} satisfies Prisma.RentalListingSelect;

export const AdminListingActionSchema = z.object({ action: z.enum(['hide', 'restore']) });

export const REPORT_STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'] as const;
export type ReportStatusValue = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_TRANSITIONS: Record<ReportStatusValue, readonly ReportStatusValue[]> = {
  OPEN: ['IN_REVIEW', 'RESOLVED', 'DISMISSED'],
  IN_REVIEW: ['RESOLVED', 'DISMISSED'],
  RESOLVED: [],
  DISMISSED: [],
};

export function canMoveReportStatus(from: ReportStatusValue, to: ReportStatusValue): boolean {
  return REPORT_STATUS_TRANSITIONS[from].includes(to);
}

export const UpdateReportStatusSchema = z.object({ status: z.enum(REPORT_STATUSES) });

export const AdminReportQuerySchema = z.object({
  view: z.enum(['QUEUE', 'ALL']).default('QUEUE'),
  listingId: z.string().trim().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(ADMIN_MAX_LIMIT).default(ADMIN_DEFAULT_LIMIT),
  cursor: z.string().trim().min(1).max(40).optional(),
});

export function parseAdminReportQuery(searchParams: URLSearchParams) {
  const value = (key: string) => searchParams.get(key) || undefined;
  return AdminReportQuerySchema.safeParse({
    view: value('view'),
    listingId: value('listingId'),
    limit: value('limit'),
    cursor: value('cursor'),
  });
}

export const adminReportSelect = {
  id: true,
  reason: true,
  details: true,
  status: true,
  createdAt: true,
  listingId: true,
  listing: { select: { id: true, title: true, isActive: true, availability: true, provider: { select: { id: true, businessName: true } } } },
  reporter: { select: { id: true, name: true, username: true } },
} satisfies Prisma.RentalListingReportSelect;

export const ADMIN_INQUIRY_STATUSES = ['PENDING', 'REPLIED', 'ARCHIVED'] as const;

export const AdminInquiryQuerySchema = z.object({
  status: z.enum(ADMIN_INQUIRY_STATUSES).optional(),
  query: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(ADMIN_MAX_LIMIT).default(ADMIN_DEFAULT_LIMIT),
  cursor: z.string().trim().min(1).max(40).optional(),
});

export function parseAdminInquiryQuery(searchParams: URLSearchParams) {
  const value = (key: string) => searchParams.get(key) || undefined;
  return AdminInquiryQuerySchema.safeParse({
    status: value('status'),
    query: value('q'),
    limit: value('limit'),
    cursor: value('cursor'),
  });
}

export const adminInquirySelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  message: true,
  status: true,
  createdAt: true,
  listing: { select: { id: true, title: true, isActive: true, provider: { select: { id: true, businessName: true, ownerName: true } } } },
  user: { select: { id: true, name: true, username: true } },
} satisfies Prisma.InquirySelect;

export const AdminAccountUpdateSchema = z.object({ accountType: MediaAccountTypeSchema });
export type MediaAccountTypeValue = z.infer<typeof MediaAccountTypeSchema>;

export type AccountSnapshot = {
  currentType: MediaAccountTypeValue | null;
  identityCount: number;
  hasOrganization: boolean;
  providerId: string | null;
  activeListings: number;
  totalListings: number;
  mediaProfileStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
};

export function accountTypeChangeBlockers(next: MediaAccountTypeValue, snapshot: AccountSnapshot): string[] {
  const blockers: string[] = [];
  if (snapshot.currentType === next) {
    blockers.push(`The account is already set to ${next}. Nothing to correct.`);
    return blockers;
  }
  if (snapshot.currentType === 'RENTAL' && snapshot.activeListings > 0) {
    blockers.push(
      `This account still has ${snapshot.activeListings} active rental listing(s). Deactivate or hide them before switching away from RENTAL, otherwise they would stay published under an account type that no longer allows listings.`,
    );
  }
  if (snapshot.currentType === 'RENTAL' && snapshot.providerId !== null && snapshot.activeListings === 0 && snapshot.totalListings > 0) {
    blockers.push(
      `This account owns a rental provider profile with ${snapshot.totalListings} listing(s) that are currently hidden. Switching away from RENTAL leaves that provider record without an account type, so hide or remove those listings first.`,
    );
  }
  if (snapshot.currentType === 'BUSINESS' && snapshot.hasOrganization) {
    blockers.push('This account owns an organization profile. Delete or transfer that profile before switching away from BUSINESS.');
  }
  if (snapshot.currentType === 'PROFESSIONAL' && snapshot.identityCount > 0) {
    blockers.push(
      `This account has ${snapshot.identityCount} professional identit(ies). Remove them before switching away from PROFESSIONAL, otherwise members would keep industry data under an account type that no longer uses it.`,
    );
  }
  return blockers;
}

export const adminAccountSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  createdAt: true,
  accountType: true,
  _count: { select: { professionalIdentities: true, inquiries: true } },
  organization: { select: { id: true, orgName: true } },
  rentalProvider: { select: { id: true, businessName: true, _count: { select: { listings: true } } } },
  mediaProfile: { select: { id: true, status: true } },
} satisfies Prisma.UserSelect;

export const AdminAccountQuerySchema = z.object({
  type: MediaAccountTypeSchema.optional(),
  query: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(ADMIN_MAX_LIMIT).default(ADMIN_DEFAULT_LIMIT),
  cursor: z.string().trim().min(1).max(40).optional(),
});

export function parseAdminAccountQuery(searchParams: URLSearchParams) {
  const value = (key: string) => searchParams.get(key) || undefined;
  return AdminAccountQuerySchema.safeParse({
    type: value('type'),
    query: value('q'),
    limit: value('limit'),
    cursor: value('cursor'),
  });
}

export function adminAccountWhere(input: z.infer<typeof AdminAccountQuerySchema>): Prisma.UserWhereInput {
  const search = input.query;
  return {
    accountType: input.type ?? { not: null },
    ...(search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { username: { contains: search, mode: 'insensitive' } }] }
      : {}),
  };
}
