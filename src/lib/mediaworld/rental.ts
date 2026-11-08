import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ALL_DISTRICTS, DISTRICTS_BY_DIVISION, DIVISIONS } from '../constants';

export const RENTAL_PRICE_UNITS = ['PER_HOUR', 'PER_DAY', 'PER_WEEK', 'PER_MONTH', 'CUSTOM'] as const;
export const RentalPriceUnitSchema = z.enum(RENTAL_PRICE_UNITS);
export type RentalPriceUnit = z.infer<typeof RentalPriceUnitSchema>;

export const RENTAL_AVAILABILITY_VALUES = ['AVAILABLE', 'UNAVAILABLE', 'TEMPORARILY_UNAVAILABLE'] as const;
export const RentalAvailabilitySchema = z.enum(RENTAL_AVAILABILITY_VALUES);
export type RentalAvailabilityValue = z.infer<typeof RentalAvailabilitySchema>;

export const MAX_RENTAL_PHOTOS = 10;
export const MIN_RENTAL_PHOTOS = 1;
export const DEFAULT_RENTAL_LIMIT = 24;
export const MAX_RENTAL_LIMIT = 60;
const MAX_INT = 2_147_483_647;

const idField = (label: string) => z.string().trim().min(1, `${label} is required.`).max(40);
const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer.`).optional();
const optionalInt = (min: number, max: number, label: string) =>
  z.number().int(`${label} must be a whole number.`).min(min).max(max).optional();
const optionalBoolean = () => z.boolean().optional();
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
const optionalEmail = z
  .string()
  .trim()
  .max(255, 'Email is too long.')
  .email('Enter a valid email address.')
  .optional();

const RentalListingCoreBase = z.object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(160),
    description: z.string().trim().min(10, 'Description must be at least 10 characters.').max(3000),
    categoryId: idField('Category'),
    subcategoryId: z.string().trim().max(40).optional(),
    pricePaisa: z.number().int('Price must be a whole number.').min(0).max(MAX_INT).default(0),
    priceUnit: RentalPriceUnitSchema,
    priceCustom: optionalText(80, 'Price description'),
    location: z.string().trim().min(2, 'Location is required.').max(160),
    division: divisionField,
    district: districtField,
    availability: RentalAvailabilitySchema.default('AVAILABLE'),
    contactPhone: optionalText(20, 'Contact phone'),
    contactEmail: optionalEmail,
    terms: optionalText(2000, 'Terms'),
    vehicleType: optionalText(60, 'Vehicle type'),
    seatingCapacity: optionalInt(1, 200, 'Seating capacity'),
    driverIncluded: optionalBoolean(),
    roomCount: optionalInt(1, 200, 'Room count'),
    facilities: optionalText(500, 'Facilities'),
    parkingAvailable: optionalBoolean(),
    availableHours: optionalText(200, 'Available hours'),
    brandModel: optionalText(160, 'Brand & model'),
    quantity: optionalInt(1, 9999, 'Quantity'),
    condition: optionalText(60, 'Condition'),
  accessories: optionalText(500, 'Accessories'),
});

type RentalListingCoreShape = z.infer<typeof RentalListingCoreBase>;

function refineRentalListing(value: RentalListingCoreShape, context: z.RefinementCtx) {
  if (value.priceUnit === 'CUSTOM') {
    if (!value.priceCustom?.trim()) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['priceCustom'], message: 'Describe the custom price.' });
    }
  } else if (value.priceUnit !== undefined && (!value.pricePaisa || value.pricePaisa <= 0)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['pricePaisa'], message: 'Enter a price above 0 or choose a custom price.' });
  }
  if (value.district && value.division) {
    const allowed = (DISTRICTS_BY_DIVISION as Record<string, readonly string[]>)[value.division] ?? [];
    if (!allowed.includes(value.district)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['district'],
        message: `${value.district} is not in ${value.division} division.`,
      });
    }
  }
}

export const RentalListingCoreSchema = RentalListingCoreBase.superRefine(refineRentalListing);
export const UpdateRentalListingSchema = RentalListingCoreBase
  .partial()
  .superRefine((value, context) => refineRentalListing(value as RentalListingCoreShape, context));

export type RentalListingCore = RentalListingCoreShape;

/** Multipart text fields arrive as strings, so values are normalised before validation. */
function asText(value: unknown): string | undefined {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  const text = asText(value);
  if (text === undefined) return undefined;
  return Number(text);
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  const text = asText(value)?.toLowerCase();
  if (text === undefined) return undefined;
  if (['1', 'true', 'yes', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'off'].includes(text)) return false;
  return value as unknown as boolean;
}

export function normalizeRentalListingFields(source: Record<string, unknown>) {
  return {
    title: asText(source.title),
    description: asText(source.description),
    categoryId: asText(source.categoryId),
    subcategoryId: asText(source.subcategoryId),
    pricePaisa: asNumber(source.pricePaisa),
    priceUnit: asText(source.priceUnit),
    priceCustom: asText(source.priceCustom),
    location: asText(source.location),
    division: asText(source.division),
    district: asText(source.district),
    availability: asText(source.availability),
    contactPhone: asText(source.contactPhone),
    contactEmail: asText(source.contactEmail),
    terms: asText(source.terms),
    vehicleType: asText(source.vehicleType),
    seatingCapacity: asNumber(source.seatingCapacity),
    driverIncluded: asBoolean(source.driverIncluded),
    roomCount: asNumber(source.roomCount),
    facilities: asText(source.facilities),
    parkingAvailable: asBoolean(source.parkingAvailable),
    availableHours: asText(source.availableHours),
    brandModel: asText(source.brandModel),
    quantity: asNumber(source.quantity),
    condition: asText(source.condition),
    accessories: asText(source.accessories),
  };
}

export function parseRentalListingFields(source: Record<string, unknown>) {
  return RentalListingCoreSchema.safeParse(normalizeRentalListingFields(source));
}

export function parseRentalListingUpdateFields(source: Record<string, unknown>) {
  return UpdateRentalListingSchema.safeParse(normalizeRentalListingFields(source));
}

/** Keeps only the text entries of a multipart body so files do not reach zod. */
export function formDataToFieldRecord(formData: FormData): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string' && !(key in fields)) fields[key] = value;
  }
  return fields;
}

export function formImageFiles(formData: FormData, field = 'photos'): File[] {
  return formData.getAll(field).filter((value): value is File => value instanceof File && value.size > 0);
}

const BROWSE_SORTS = ['recent', 'price_asc', 'price_desc'] as const;
const BrowseSortSchema = z.enum(BROWSE_SORTS);

export const RentalBrowseInputSchema = z.object({
  query: z.string().trim().max(120, 'Search query must be 120 characters or fewer.').optional(),
  categoryId: z.string().trim().max(40).optional(),
  subcategoryId: z.string().trim().max(40).optional(),
  division: divisionField,
  district: districtField,
  availability: RentalAvailabilitySchema.optional(),
  maxPricePaisa: z.coerce.number().int().min(0).max(MAX_INT).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_RENTAL_LIMIT).default(DEFAULT_RENTAL_LIMIT),
  cursor: z.string().trim().min(1).max(40).optional(),
  sort: BrowseSortSchema.default('recent'),
});

export type RentalBrowseInput = z.infer<typeof RentalBrowseInputSchema>;

export function parseRentalBrowseInput(searchParams: URLSearchParams) {
  // An empty query-string value means "not filtered on", not "match nothing".
  const value = (key: string) => searchParams.get(key) || undefined;
  return RentalBrowseInputSchema.safeParse({
    query: value('q') ?? value('query'),
    categoryId: value('categoryId'),
    subcategoryId: value('subcategoryId'),
    division: value('division'),
    district: value('district'),
    availability: value('availability'),
    maxPricePaisa: value('maxPrice'),
    limit: value('limit'),
    cursor: value('cursor'),
    sort: value('sort'),
  });
}

export const CreateRentalInquirySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
  email: z.string().trim().max(255, 'Email is too long.').email('Enter a valid email address.'),
  phone: optionalText(20, 'Phone number'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters.').max(2000),
});
export type CreateRentalInquiryInput = z.infer<typeof CreateRentalInquirySchema>;

export const RentalInquiryStatusSchema = z.enum(['REPLIED', 'ARCHIVED', 'PENDING']);

export const ReportRentalListingSchema = z.object({
  reason: z.string().trim().min(3, 'Choose a reason.').max(120),
  details: optionalText(1000, 'Details'),
});

export const rentalProviderPublicSelect = {
  id: true,
  businessName: true,
  ownerName: true,
  location: true,
  logoUrl: true,
} as const;

export const rentalListingCardSelect = {
  id: true,
  title: true,
  description: true,
  pricePaisa: true,
  priceUnit: true,
  priceCustom: true,
  location: true,
  division: true,
  district: true,
  availability: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  providerId: true,
  category: { select: { id: true, code: true, nameEn: true, nameBn: true } },
  subcategory: { select: { id: true, code: true, nameEn: true, nameBn: true } },
  provider: { select: rentalProviderPublicSelect },
  photos: { orderBy: { position: 'asc' }, select: { id: true, url: true, position: true } },
} satisfies Prisma.RentalListingSelect;

export const rentalListingDetailSelect = {
  ...rentalListingCardSelect,
  terms: true,
  contactPhone: true,
  contactEmail: true,
  vehicleType: true,
  seatingCapacity: true,
  driverIncluded: true,
  roomCount: true,
  facilities: true,
  parkingAvailable: true,
  availableHours: true,
  brandModel: true,
  quantity: true,
  condition: true,
  accessories: true,
  // The provider's account-level contact details stay server-side; a listing only publishes
  // the per-listing contactPhone/contactEmail the provider chose to fill in.
  provider: { select: { ...rentalProviderPublicSelect, description: true } },
} satisfies Prisma.RentalListingSelect;

export type RentalListingCard = Prisma.RentalListingGetPayload<{ select: typeof rentalListingCardSelect }>;
export type RentalListingDetail = Prisma.RentalListingGetPayload<{ select: typeof rentalListingDetailSelect }>;

/** Detail pages additionally need the provider's userId to tell owner viewers apart. */
export const rentalListingDetailPageSelect = {
  ...rentalListingDetailSelect,
  provider: { select: { ...rentalProviderPublicSelect, description: true, userId: true } },
} satisfies Prisma.RentalListingSelect;
export type RentalListingDetailPage = Prisma.RentalListingGetPayload<{ select: typeof rentalListingDetailPageSelect }>;

export function rentalListingOrderBy(sort: RentalBrowseInput['sort']): Prisma.RentalListingOrderByWithRelationInput[] {
  if (sort === 'price_asc') return [{ pricePaisa: 'asc' }, { id: 'asc' }];
  if (sort === 'price_desc') return [{ pricePaisa: 'desc' }, { id: 'desc' }];
  return [{ createdAt: 'desc' }, { id: 'desc' }];
}
