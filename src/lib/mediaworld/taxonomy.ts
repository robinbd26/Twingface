import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type TaxonomyDesignation = { id: string; code: string; nameEn: string; nameBn: string };
type TaxonomyCategory = { id: string; code: string; nameEn: string; nameBn: string; designations: TaxonomyDesignation[] };
type TaxonomyIndustry = { id: string; code: string; nameEn: string; nameBn: string; categories: TaxonomyCategory[] };
type TaxonomyNode = { id: string; code: string; nameEn: string; nameBn: string };
type RentalTaxonomyCategory = TaxonomyNode & { subcategories: TaxonomyNode[] };

export type TaxonomySnapshot = {
  industries: TaxonomyIndustry[];
  organizationTypes: TaxonomyNode[];
  rentalCategories: RentalTaxonomyCategory[];
};

type IndustryWithCategories = Prisma.IndustryGetPayload<{
  include: {
    categories: {
      include: { designations: { include: { designation: true } } };
    };
  };
}>;

function shapeIndustry(industry: IndustryWithCategories): TaxonomyIndustry {
  return {
    id: industry.id,
    code: industry.code,
    nameEn: industry.nameEn,
    nameBn: industry.nameBn,
    categories: industry.categories.map((category) => ({
      id: category.id,
      code: category.code,
      nameEn: category.nameEn,
      nameBn: category.nameBn,
      designations: category.designations
        .filter((link) => link.designation.isActive)
        .map((link) => ({
          id: link.designation.id,
          code: link.designation.code,
          nameEn: link.designation.nameEn,
          nameBn: link.designation.nameBn,
        })),
    })),
  };
}

export async function getTaxonomySnapshot(): Promise<TaxonomySnapshot> {
  const [industries, organizationTypes, rentalCategories] = await Promise.all([
    prisma.industry.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      include: {
        categories: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
          include: {
            designations: {
              include: {
                designation: true,
              },
              orderBy: { designation: { sortOrder: 'asc' } },
            },
          },
        },
      },
    }),
    prisma.organizationType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: { id: true, code: true, nameEn: true, nameBn: true },
    }),
    prisma.rentalCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        nameEn: true,
        nameBn: true,
        subcategories: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
          select: { id: true, code: true, nameEn: true, nameBn: true },
        },
      },
    }),
  ]);

  return {
    industries: industries.map(shapeIndustry),
    organizationTypes,
    rentalCategories,
  };
}
