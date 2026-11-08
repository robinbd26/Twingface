import { prisma } from '@/lib/db';
import {
  parseRentalBrowseInput,
  RentalBrowseInputSchema,
  rentalListingCardSelect,
  rentalListingOrderBy,
  type RentalBrowseInput,
  type RentalListingCard,
} from './rental';

export type RentalBrowseResult = { listings: RentalListingCard[]; nextCursor: string | null };

export const DEFAULT_RENTAL_BROWSE_INPUT: RentalBrowseInput = RentalBrowseInputSchema.parse({});

/** Shared by /api/for-rent and the /for-rent pages so browse rules never drift apart. */
export async function browseRentalListings(input: RentalBrowseInput): Promise<RentalBrowseResult> {
  const { query, categoryId, subcategoryId, division, district, availability, maxPricePaisa, limit, cursor, sort } = input;
  const search = query?.trim();

  const listings = await prisma.rentalListing.findMany({
    where: {
      isActive: true,
      availability: availability ?? 'AVAILABLE',
      ...(categoryId ? { categoryId } : {}),
      ...(subcategoryId ? { subcategoryId } : {}),
      ...(division ? { division } : {}),
      ...(district ? { district } : {}),
      ...(maxPricePaisa !== undefined ? { pricePaisa: { lte: maxPricePaisa } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { location: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: rentalListingOrderBy(sort),
    select: rentalListingCardSelect,
  });

  const hasMore = listings.length > limit;
  const page = hasMore ? listings.slice(0, limit) : listings;
  return { listings: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null };
}

export function searchParamsFromRecord(record: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === 'string') params.set(key, first);
  }
  return params;
}

/** Rebuilds the /api/for-rent query for the currently applied browse filters. */
export function rentalBrowseApiQuery(input: RentalBrowseInput): URLSearchParams {
  const params = new URLSearchParams();
  if (input.query) params.set('q', input.query);
  if (input.categoryId) params.set('categoryId', input.categoryId);
  if (input.subcategoryId) params.set('subcategoryId', input.subcategoryId);
  if (input.division) params.set('division', input.division);
  if (input.district) params.set('district', input.district);
  if (input.availability) params.set('availability', input.availability);
  if (input.maxPricePaisa !== undefined) params.set('maxPrice', String(input.maxPricePaisa));
  if (input.sort !== 'recent') params.set('sort', input.sort);
  return params;
}

/** Browse URLs carry the price ceiling in Taka; listings are stored in paisa. */
export function parseRentalBrowseParams(params: URLSearchParams) {
  const normalized = new URLSearchParams(params);
  const priceInTaka = normalized.get('maxPriceTaka');
  if (priceInTaka) {
    normalized.delete('maxPriceTaka');
    if (!normalized.get('maxPrice')) {
      normalized.set('maxPrice', String(Math.round(Number(priceInTaka) * 100)));
    }
  }
  return parseRentalBrowseInput(normalized);
}
