import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { ALL_DISTRICTS, DIVISIONS } from '../constants';
import { searchParamsFromRecord } from './rental-browse';
import { showcaseItemSelect, talentSettingsSelect } from './showcase-data';

export const DEFAULT_TALENT_LIMIT = 24;
export const MAX_TALENT_LIMIT = 60;

const TALENT_SORTS = ['recent', 'name'] as const;
const TalentSortSchema = z.enum(TALENT_SORTS);

const idField = z.string().trim().max(40).optional();
const divisionField = z
  .string()
  .trim()
  .max(30)
  .refine((value) => value === '' || (DIVISIONS as readonly string[]).includes(value), 'Unknown division.')
  .optional();
const districtField = z
  .string()
  .trim()
  .max(30)
  .refine((value) => value === '' || (ALL_DISTRICTS as readonly string[]).includes(value), 'Unknown district.')
  .optional();

export const TalentBrowseInputSchema = z.object({
  query: z.string().trim().max(120, 'Search query must be 120 characters or fewer.').optional(),
  industryId: idField,
  mainCategoryId: idField,
  designationId: idField,
  division: divisionField,
  district: districtField,
  limit: z.coerce.number().int().min(1).max(MAX_TALENT_LIMIT).default(DEFAULT_TALENT_LIMIT),
  cursor: z.string().trim().min(1).max(40).optional(),
  sort: TalentSortSchema.default('recent'),
});

export type TalentBrowseInput = z.infer<typeof TalentBrowseInputSchema>;

export const DEFAULT_TALENT_BROWSE_INPUT: TalentBrowseInput = TalentBrowseInputSchema.parse({});

export function parseTalentBrowseParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): z.SafeParseReturnType<unknown, TalentBrowseInput> {
  const search = params instanceof URLSearchParams ? params : searchParamsFromRecord(params);
  // An empty query-string value means "not filtered on", not "match nothing".
  const value = (key: string) => search.get(key) || undefined;
  return TalentBrowseInputSchema.safeParse({
    query: value('q') ?? value('query'),
    industryId: value('industryId'),
    mainCategoryId: value('mainCategoryId'),
    designationId: value('designationId'),
    division: value('division'),
    district: value('district'),
    limit: value('limit'),
    cursor: value('cursor'),
    sort: value('sort'),
  });
}

const taxonomyNodeSelect = { id: true, code: true, nameEn: true, nameBn: true } as const;

export const talentIdentitySelect = {
  where: {
    industry: { isActive: true },
    mainCategory: { isActive: true },
    designation: { isActive: true },
  },
  orderBy: [
    { industry: { sortOrder: 'asc' } } as const,
    { mainCategory: { sortOrder: 'asc' } } as const,
    { designation: { sortOrder: 'asc' } } as const,
  ],
  select: {
    id: true,
    industry: { select: taxonomyNodeSelect },
    mainCategory: { select: taxonomyNodeSelect },
    designation: { select: taxonomyNodeSelect },
  },
} satisfies Prisma.UserProfessionalIdentityFindManyArgs;

export const talentCardSelect = {
  id: true,
  name: true,
  username: true,
  profileImage: true,
  bio: true,
  division: true,
  district: true,
  accountType: true,
  professionalIdentities: talentIdentitySelect,
  organization: {
    select: {
      orgName: true,
      city: true,
      description: true,
      logoUrl: true,
      orgType: { select: taxonomyNodeSelect },
    },
  },
  rentalProvider: {
    select: { id: true, businessName: true, ownerName: true, location: true, description: true },
  },
} satisfies Prisma.UserSelect;

/** The public profile page additionally shows owner-supplied contact details. */
export const talentProfileSelect = {
  ...talentCardSelect,
  coverImage: true,
  phone: true,
  email: true,
  presentAddress: true,
  talentSettings: { select: talentSettingsSelect },
  showcaseItems: {
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: showcaseItemSelect,
  },
  organization: {
    select: {
      orgName: true,
      contactName: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      description: true,
      website: true,
      logoUrl: true,
      orgType: { select: taxonomyNodeSelect },
    },
  },
  rentalProvider: {
    select: {
      id: true,
      businessName: true,
      ownerName: true,
      phone: true,
      email: true,
      location: true,
      fullAddress: true,
      description: true,
      logoUrl: true,
    },
  },
} satisfies Prisma.UserSelect;

export type TalentRow = Prisma.UserGetPayload<{ select: typeof talentCardSelect }>;
export type TalentProfile = Prisma.UserGetPayload<{ select: typeof talentProfileSelect }>;
export type TalentBrowseResult = { talents: TalentRow[]; nextCursor: string | null };

function talentOrderBy(sort: TalentBrowseInput['sort']): Prisma.UserOrderByWithRelationInput[] {
  if (sort === 'name') return [{ name: 'asc' }, { id: 'asc' }];
  return [{ createdAt: 'desc' }, { id: 'desc' }];
}

/** Shared by /api/mediaworld/talent and the /mediaworld/talent page so browse rules never drift apart. */
export async function browseTalents(input: TalentBrowseInput): Promise<TalentBrowseResult> {
  const { query, industryId, mainCategoryId, designationId, division, district, limit, cursor, sort } = input;
  const search = query?.trim();
  const identityFilter = {
    ...(industryId ? { industryId } : {}),
    ...(mainCategoryId ? { mainCategoryId } : {}),
    ...(designationId ? { designationId } : {}),
  };

  const talents = await prisma.user.findMany({
    where: {
      accountType: { not: null },
      ...(division ? { division } : {}),
      ...(district ? { district } : {}),
      ...(Object.keys(identityFilter).length ? { professionalIdentities: { some: identityFilter } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
              { bio: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: talentOrderBy(sort),
    select: talentCardSelect,
  });

  const hasMore = talents.length > limit;
  const page = hasMore ? talents.slice(0, limit) : talents;
  return { talents: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null };
}

/**
 * The public /mediaworld landing may only carry what an anonymous visitor is allowed to see, so this
 * reuses the card fields but drops organization/rentalProvider: both hold owner-written free text
 * that can contain a phone number or address, and the landing renders outside the signed-in browse gate.
 */
export const talentDirectorySelect = {
  id: true,
  name: true,
  username: true,
  profileImage: true,
  bio: true,
  division: true,
  district: true,
  accountType: true,
  professionalIdentities: talentIdentitySelect,
} satisfies Prisma.UserSelect;

export type TalentDirectoryRow = Prisma.UserGetPayload<{ select: typeof talentDirectorySelect }>;

/** Newest directory profiles for the public landing page; the caller filters them by lane and area client-side. */
export async function browseDirectoryTalents(limit = MAX_TALENT_LIMIT): Promise<TalentDirectoryRow[]> {
  return prisma.user.findMany({
    where: { accountType: { not: null } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    select: talentDirectorySelect,
  });
}

/** Rebuilds the /api/mediaworld/talent query for the currently applied browse filters. */
export function talentBrowseApiQuery(input: TalentBrowseInput): URLSearchParams {
  const params = new URLSearchParams();
  if (input.query) params.set('q', input.query);
  if (input.industryId) params.set('industryId', input.industryId);
  if (input.mainCategoryId) params.set('mainCategoryId', input.mainCategoryId);
  if (input.designationId) params.set('designationId', input.designationId);
  if (input.division) params.set('division', input.division);
  if (input.district) params.set('district', input.district);
  if (input.sort !== 'recent') params.set('sort', input.sort);
  return params;
}

export { searchParamsFromRecord };
