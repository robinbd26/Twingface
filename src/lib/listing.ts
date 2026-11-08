import type { Prisma } from '@prisma/client';

export const LISTING_CATEGORIES = [
  'Vehicles',
  'Property',
  'Electronics',
  'Fashion',
  'Home & Garden',
  'Jobs',
  'Services',
  'Free Stuff',
  'Other',
] as const;

export const LISTING_CONDITIONS = ['NEW', 'USED_LIKE_NEW', 'USED_GOOD', 'USED_FAIR'] as const;

export const DEFAULT_LISTINGS_PER_PAGE = 24;
export const MAX_LISTINGS_PER_PAGE = 60;

const safeUserSelect = { id: true, name: true, username: true, profileImage: true } satisfies Prisma.UserSelect;

export const safeListingSelect = {
  id: true,
  title: true,
  price: true,
  description: true,
  category: true,
  condition: true,
  status: true,
  location: true,
  imageUrl: true,
  sellerId: true,
  createdAt: true,
  updatedAt: true,
  seller: { select: safeUserSelect },
} satisfies Prisma.ListingSelect;

export type SafeListing = Prisma.ListingGetPayload<{ select: typeof safeListingSelect }>;

export function parseListingsLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LISTINGS_PER_PAGE;
  return Math.min(parsed, MAX_LISTINGS_PER_PAGE);
}

export function conditionLabel(condition: string): string {
  switch (condition) {
    case 'NEW': return 'New';
    case 'USED_LIKE_NEW': return 'Used · like new';
    case 'USED_GOOD': return 'Used · good';
    case 'USED_FAIR': return 'Used · fair';
    default: return condition;
  }
}

// Format an integer BDT price with thousands separators (৳12,500).
export function formatPrice(price: number): string {
  return `৳${price.toLocaleString('en-US')}`;
}
