import type { Prisma } from '@prisma/client';
import { z } from 'zod';

/**
 * MediaWorld data layer.
 *
 * Media World is a directory layer over the existing marketplace:
 * - listings reuse the `MarketplaceListing` model + `MarketplaceCategory` enum
 * - professional fields reuse `User.profession` / `User.bio`
 * - contact-seller reuses the existing marketplace messaging API
 * No new Prisma models are required, so no migration is needed.
 */

export const MediaWorldCategorySchema = z.enum([
  'ELECTRONICS',
  'VEHICLES',
  'PROPERTY',
  'FURNITURE',
  'FASHION',
  'HOBBIES',
  'OTHER',
  'DRONE',
  'SPOT',
  'STORY_WRITER',
  'DIRECTOR',
  'ARTIST',
  'PRODUCER',
  'DOP',
  'CAMERA_HOUSE',
  'SHOOTING_HOUSE',
  'MAKEUP_MAN',
  'PRODUCTION',
  'SHOOTING_BUS_CAR',
  'LIGHT_HOUSE',
]);

export type MediaWorldCategory = z.infer<typeof MediaWorldCategorySchema>;

export const MEDIA_WORLD_SERVICE_CATEGORIES = [
  'DRONE',
  'SPOT',
  'STORY_WRITER',
  'DIRECTOR',
  'ARTIST',
  'PRODUCER',
  'DOP',
  'CAMERA_HOUSE',
  'SHOOTING_HOUSE',
  'MAKEUP_MAN',
  'PRODUCTION',
  'SHOOTING_BUS_CAR',
  'LIGHT_HOUSE',
] as const satisfies readonly MediaWorldCategory[];

export type MediaWorldServiceCategory = (typeof MEDIA_WORLD_SERVICE_CATEGORIES)[number];
export const MediaWorldServiceCategorySchema = z.enum(MEDIA_WORLD_SERVICE_CATEGORIES);

export function isMediaWorldServiceCategory(category: string): category is MediaWorldServiceCategory {
  return (MEDIA_WORLD_SERVICE_CATEGORIES as readonly string[]).includes(category);
}

export const MEDIA_WORLD_CATEGORY_LABELS: Record<MediaWorldCategory, string> = {
  ELECTRONICS: 'Electronics',
  VEHICLES: 'Vehicles',
  PROPERTY: 'Property',
  FURNITURE: 'Furniture',
  FASHION: 'Fashion',
  HOBBIES: 'Hobbies',
  OTHER: 'Other',
  DRONE: 'Drone Service',
  SPOT: 'Shooting Spot',
  STORY_WRITER: 'Story Writers',
  DIRECTOR: 'Director',
  ARTIST: 'Artist',
  PRODUCER: 'Producer',
  DOP: 'DoP',
  CAMERA_HOUSE: 'Camera House',
  SHOOTING_HOUSE: 'Shooting House',
  MAKEUP_MAN: 'Makeup Man',
  PRODUCTION: 'Production',
  SHOOTING_BUS_CAR: 'Shooting Bus/Car',
  LIGHT_HOUSE: 'Light House',
};

export const MEDIA_WORLD_CATEGORIES = Object.keys(MEDIA_WORLD_CATEGORY_LABELS) as MediaWorldCategory[];

export const MediaWorldConditionSchema = z.enum(['NEW', 'USED']);
export type MediaWorldCondition = z.infer<typeof MediaWorldConditionSchema>;

export const MEDIAWORLD_DIVISIONS = [
  'Dhaka',
  'Chattogram',
  'Khulna',
  'Rajshahi',
  'Rangpur',
  'Barishal',
  'Sylhet',
  'Mymensingh',
] as const;

export type MediaWorldDivision = (typeof MEDIAWORLD_DIVISIONS)[number];

export const DISTRICTS_BY_DIVISION: Record<MediaWorldDivision, readonly string[]> = {
  Dhaka: [
    'Dhaka',
    'Faridpur',
    'Gazipur',
    'Gopalganj',
    'Kishoreganj',
    'Madaripur',
    'Manikganj',
    'Munshiganj',
    'Narayanganj',
    'Narsingdi',
    'Rajbari',
    'Shariatpur',
    'Tangail',
  ],
  Chattogram: [
    'Bandarban',
    'Brahmanbaria',
    'Chandpur',
    'Chattogram',
    'Comilla',
    "Cox's Bazar",
    'Feni',
    'Khagrachhari',
    'Lakshmipur',
    'Noakhali',
    'Rangamati',
  ],
  Khulna: ['Bagerhat', 'Chuadanga', 'Jashore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'],
  Rajshahi: ['Bogura', 'Joypurhat', 'Naogaon', 'Natore', 'Chapai Nawabganj', 'Pabna', 'Rajshahi', 'Sirajganj'],
  Rangpur: ['Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon'],
  Barishal: ['Barguna', 'Barishal', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur'],
  Sylhet: ['Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet'],
  Mymensingh: ['Jamalpur', 'Mymensingh', 'Netrakona', 'Sherpur'],
};

export type MediaWorldListing = {
  id: string;
  title: string;
  description: string;
  pricePaisa: number;
  category: string;
  condition: string;
  status: 'AVAILABLE' | 'SOLD_OUT';
  location: string;
  images: Array<{ url: string; position: number }>;
  sellerId: string;
  createdAt: Date;
  updatedAt: Date;
  seller?: {
    id: string;
    name: string;
    username: string;
    profileImage: string | null;
    profession: string | null;
    bio: string | null;
  };
};

export type MediaWorldDivisionGroup = { division: string; items: MediaWorldListing[] };

export function districtOptionsForDivision(division: string): readonly string[] {
  return (MEDIAWORLD_DIVISIONS as readonly string[]).includes(division)
    ? (DISTRICTS_BY_DIVISION[division as MediaWorldDivision] ?? [])
    : [];
}

export function filterListings(
  listings: MediaWorldListing[],
  query: string,
  category: string,
  division: string,
  district: string,
): MediaWorldListing[] {
  const normalizedQuery = query.trim().toLowerCase();
  return listings.filter((listing) => {
    if (category && listing.category.toLowerCase() !== category.toLowerCase()) return false;
    if (division && listing.location.toLowerCase() !== division.toLowerCase()) return false;
    if (district && listing.location.toLowerCase() !== district.toLowerCase()) return false;
    if (normalizedQuery) {
      const haystack = `${listing.title} ${listing.description} ${listing.location}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    return true;
  });
}

export function groupByDivision(listings: MediaWorldListing[]): MediaWorldDivisionGroup[] {
  const grouped = new Map<string, MediaWorldListing[]>();
  for (const listing of listings) {
    const division = listing.location || 'Unknown';
    const bucket = grouped.get(division) ?? [];
    bucket.push(listing);
    grouped.set(division, bucket);
  }
  return Array.from(grouped.entries()).map(([division, items]) => ({ division, items }));
}

export const safeMediaWorldListingSelect = {
  id: true,
  title: true,
  description: true,
  pricePaisa: true,
  category: true,
  condition: true,
  status: true,
  location: true,
  images: { select: { url: true, position: true } },
  sellerId: true,
  createdAt: true,
  updatedAt: true,
  seller: {
    select: {
      id: true,
      name: true,
      username: true,
      profileImage: true,
      profession: true,
      bio: true,
    },
  },
} satisfies Prisma.MarketplaceListingSelect;

export type SafeMediaWorldListing = Prisma.MarketplaceListingGetPayload<{
  select: typeof safeMediaWorldListingSelect;
}>;
