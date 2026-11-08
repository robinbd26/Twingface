import { PrismaClient } from '@prisma/client';
import {
  TAXONOMY_INDUSTRIES,
  TAXONOMY_ORGANIZATION_TYPES,
  TAXONOMY_RENTAL_CATEGORIES,
} from '../src/lib/mediaworld/taxonomy-data.ts';

const prisma = new PrismaClient();

// Categories that were replaced by a newer structure. They are deactivated
// rather than deleted because existing identities may still reference them.
const RETIRED_CATEGORY_CODES = ['FILM_SOUND_MUSIC', 'NATOK_SOUND_MUSIC', 'TVC_SOUND_MUSIC'];

async function main() {
  const seenDesignations = new Map<string, { nameEn: string; nameBn: string }>();
  let categoryCount = 0;
  let designationCount = 0;
  let linkCount = 0;
  let removedLinks = 0;

  for (const [industryIndex, industry] of TAXONOMY_INDUSTRIES.entries()) {
    const industryRow = await prisma.industry.upsert({
      where: { code: industry.code },
      update: {
        nameEn: industry.nameEn,
        nameBn: industry.nameBn,
        sortOrder: industryIndex + 1,
        isActive: true,
      },
      create: {
        code: industry.code,
        nameEn: industry.nameEn,
        nameBn: industry.nameBn,
        sortOrder: industryIndex + 1,
      },
    });

    for (const [categoryIndex, category] of industry.categories.entries()) {
      const categoryRow = await prisma.mainCategory.upsert({
        where: {
          industryId_code: { industryId: industryRow.id, code: category.code },
        },
        update: {
          nameEn: category.nameEn,
          nameBn: category.nameBn,
          sortOrder: categoryIndex + 1,
          isActive: true,
        },
        create: {
          industryId: industryRow.id,
          code: category.code,
          nameEn: category.nameEn,
          nameBn: category.nameBn,
          sortOrder: categoryIndex + 1,
        },
      });
      categoryCount += 1;

      for (const designation of category.designations) {
        const existing = seenDesignations.get(designation.code);
        if (existing) {
          if (
            existing.nameEn !== designation.nameEn ||
            existing.nameBn !== designation.nameBn
          ) {
            throw new Error(
              `Designation code "${designation.code}" has conflicting names: ` +
                `"${existing.nameEn}/${existing.nameBn}" vs "${designation.nameEn}/${designation.nameBn}"`,
            );
          }
        } else {
          seenDesignations.set(designation.code, {
            nameEn: designation.nameEn,
            nameBn: designation.nameBn,
          });
        }

        const designationRow = await prisma.designation.upsert({
          where: { code: designation.code },
          update: {
            nameEn: designation.nameEn,
            nameBn: designation.nameBn,
            isActive: true,
          },
          create: {
            code: designation.code,
            nameEn: designation.nameEn,
            nameBn: designation.nameBn,
          },
        });
        if (!existing) designationCount += 1;

        await prisma.designationCategory.upsert({
          where: {
            designationId_categoryId: {
              designationId: designationRow.id,
              categoryId: categoryRow.id,
            },
          },
          update: {},
          create: {
            designationId: designationRow.id,
            categoryId: categoryRow.id,
          },
        });
        linkCount += 1;
      }

      // The canonical data is the source of truth for these categories: drop links
      // that were removed from it so retired professions stop being offered.
      const desiredCodes = new Set(category.designations.map((designation) => designation.code));
      const existingLinks = await prisma.designationCategory.findMany({
        where: { categoryId: categoryRow.id },
        select: { designationId: true, designation: { select: { code: true } } },
      });
      const staleLinks = existingLinks.filter((link) => !desiredCodes.has((link.designation as { code: string }).code));
      if (staleLinks.length > 0) {
        await prisma.designationCategory.deleteMany({
          where: {
            categoryId: categoryRow.id,
            designationId: { in: staleLinks.map((link) => link.designationId) },
          },
        });
        removedLinks += staleLinks.length;
      }
    }
  }

  const retiredCategories = await prisma.mainCategory.updateMany({
    where: { code: { in: RETIRED_CATEGORY_CODES }, isActive: true },
    data: { isActive: false },
  });

  // A designation with no category left cannot be selected anywhere. Deactivate
  // instead of deleting so existing identities keep resolving their names.
  const orphaned = await prisma.designation.findMany({
    where: { isActive: true, categories: { none: {} } },
    select: { code: true },
  });
  if (orphaned.length > 0) {
    await prisma.designation.updateMany({
      where: { code: { in: orphaned.map((designation) => designation.code) } },
      data: { isActive: false },
    });
  }

  for (const [index, orgType] of TAXONOMY_ORGANIZATION_TYPES.entries()) {
    await prisma.organizationType.upsert({
      where: { code: orgType.code },
      update: {
        nameEn: orgType.nameEn,
        nameBn: orgType.nameBn,
        sortOrder: index + 1,
      },
      create: {
        code: orgType.code,
        nameEn: orgType.nameEn,
        nameBn: orgType.nameBn,
        sortOrder: index + 1,
      },
    });
  }

  let subcategoryCount = 0;
  for (const [index, rentalCategory] of TAXONOMY_RENTAL_CATEGORIES.entries()) {
    const categoryRow = await prisma.rentalCategory.upsert({
      where: { code: rentalCategory.code },
      update: {
        nameEn: rentalCategory.nameEn,
        nameBn: rentalCategory.nameBn,
        sortOrder: index + 1,
      },
      create: {
        code: rentalCategory.code,
        nameEn: rentalCategory.nameEn,
        nameBn: rentalCategory.nameBn,
        sortOrder: index + 1,
      },
    });

    for (const [subIndex, subcategory] of rentalCategory.subcategories.entries()) {
      await prisma.rentalSubcategory.upsert({
        where: {
          categoryId_code: {
            categoryId: categoryRow.id,
            code: subcategory.code,
          },
        },
        update: {
          nameEn: subcategory.nameEn,
          nameBn: subcategory.nameBn,
          sortOrder: subIndex + 1,
        },
        create: {
          categoryId: categoryRow.id,
          code: subcategory.code,
          nameEn: subcategory.nameEn,
          nameBn: subcategory.nameBn,
          sortOrder: subIndex + 1,
        },
      });
      subcategoryCount += 1;
    }
  }

  console.log(`Industries:      ${TAXONOMY_INDUSTRIES.length}`);
  console.log(`Categories:      ${categoryCount}`);
  console.log(`Designations:    ${designationCount} (unique, shared across categories)`);
  console.log(`Category links:  ${linkCount}`);
  console.log(`Removed links:   ${removedLinks}`);
  console.log(`Retired categories: ${retiredCategories.count}`);
  console.log(`Deactivated:     ${orphaned.length} designation(s) with no category left`);
  console.log(`Org types:       ${TAXONOMY_ORGANIZATION_TYPES.length}`);
  console.log(`Rental categories:  ${TAXONOMY_RENTAL_CATEGORIES.length}`);
  console.log(`Rental subcategories: ${subcategoryCount}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
