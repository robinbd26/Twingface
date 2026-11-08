import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { MAX_POST_IMAGE_BYTES, POST_IMAGE_MIME_TYPES } from './post-media';
import { safeFriendUserSelect } from './relationship';

export const MAX_MARKETPLACE_IMAGES = 10;
export const DEFAULT_MARKETPLACE_LIMIT = 24;
export const MAX_MARKETPLACE_LIMIT = 30;
const MAX_PRISMA_INT = 2_147_483_647;

export const MarketplaceCategorySchema = z.enum([
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
export const MarketplaceConditionSchema = z.enum(['NEW', 'USED']);
export const MarketplaceStatusSchema = z.enum(['AVAILABLE', 'SOLD_OUT']);

function isFileLike(value: unknown): value is File {
  return typeof value === 'object'
    && value !== null
    && 'size' in value
    && 'type' in value
    && 'arrayBuffer' in value
    && typeof value.arrayBuffer === 'function';
}

function stringEntry(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value : '';
}

const BDT_PRICE_PATTERN = /^\d+(?:\.\d{1,2})?$/;

const pricePaisaSchema = z.string().trim().refine(
  (value) => BDT_PRICE_PATTERN.test(value),
  'Enter a non-negative price with at most two decimal places.',
).transform((value) => {
  const [whole, fraction = ''] = value.split('.');
  return (Number(whole) * 100) + Number(fraction.padEnd(2, '0'));
}).refine((value) => Number.isSafeInteger(value) && value <= MAX_PRISMA_INT, 'Price is too large.');

const listingFieldsSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(120, 'Title must be 120 characters or fewer.'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters.').max(2000, 'Description must be 2,000 characters or fewer.'),
  pricePaisa: pricePaisaSchema,
  category: MarketplaceCategorySchema,
  condition: MarketplaceConditionSchema,
  location: z.string().trim().min(2, 'Location must be at least 2 characters.').max(120, 'Location must be 120 characters or fewer.'),
});

const marketplaceImageSchema = z.custom<File>(isFileLike, 'Select a valid image file.').superRefine((file, context) => {
  if (!POST_IMAGE_MIME_TYPES.includes(file.type as (typeof POST_IMAGE_MIME_TYPES)[number])) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Choose a JPEG, PNG, WebP, or GIF image.' });
  }
  if (file.size > MAX_POST_IMAGE_BYTES) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Each image must be 5 MB or smaller.' });
  }
});

const createMarketplaceSchema = listingFieldsSchema.extend({
  images: z.array(marketplaceImageSchema).min(1, 'Add at least one image.').max(MAX_MARKETPLACE_IMAGES, 'You can add up to 10 images.'),
});

const updateMarketplaceSchema = listingFieldsSchema.partial().extend({
  status: MarketplaceStatusSchema.optional(),
  images: z.array(marketplaceImageSchema).max(MAX_MARKETPLACE_IMAGES, 'You can add up to 10 images.'),
  retainedImageIds: z.array(z.string().trim().min(1).max(40)).max(MAX_MARKETPLACE_IMAGES),
}).superRefine((value, context) => {
  if (!Object.keys(value).some((key) => key !== 'images' && key !== 'retainedImageIds') && !value.images.length && !value.retainedImageIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide at least one listing update.' });
  }
});

export function parseMarketplaceCreateInput(formData: FormData) {
  return createMarketplaceSchema.safeParse({
    title: stringEntry(formData.get('title')),
    description: stringEntry(formData.get('description')),
    pricePaisa: stringEntry(formData.get('price')),
    category: stringEntry(formData.get('category')),
    condition: stringEntry(formData.get('condition')),
    location: stringEntry(formData.get('location')),
    images: formData.getAll('images'),
  });
}

export function parseMarketplaceUpdateInput(formData: FormData) {
  const fields: Record<string, unknown> = {
    images: formData.getAll('images').filter(isFileLike),
    retainedImageIds: formData.getAll('retainedImageIds').filter((value): value is string => typeof value === 'string'),
  };
  for (const [formField, schemaField] of [['title', 'title'], ['description', 'description'], ['price', 'pricePaisa'], ['category', 'category'], ['condition', 'condition'], ['location', 'location'], ['status', 'status']] as const) {
    const value = formData.get(formField);
    if (typeof value === 'string' && value.trim()) fields[schemaField] = value;
  }
  return updateMarketplaceSchema.safeParse(fields);
}

export function parseMarketplaceBrowseInput(searchParams: URLSearchParams) {
  const requestedLimit = Number.parseInt(searchParams.get('limit') ?? '', 10);
  return {
    cursor: searchParams.get('cursor') || null,
    limit: Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, MAX_MARKETPLACE_LIMIT) : DEFAULT_MARKETPLACE_LIMIT,
    category: MarketplaceCategorySchema.safeParse(searchParams.get('category')).success
      ? searchParams.get('category') as z.infer<typeof MarketplaceCategorySchema>
      : null,
    query: (searchParams.get('q') ?? '').trim().slice(0, 120),
  };
}

export const safeMarketplaceListingSelect = {
  id: true,
  title: true,
  description: true,
  pricePaisa: true,
  category: true,
  condition: true,
  location: true,
  status: true,
  sellerId: true,
  createdAt: true,
  updatedAt: true,
  seller: { select: safeFriendUserSelect },
  images: {
    orderBy: { position: 'asc' },
    select: { id: true, url: true, position: true },
  },
} satisfies Prisma.MarketplaceListingSelect;

export type SafeMarketplaceListing = Prisma.MarketplaceListingGetPayload<{ select: typeof safeMarketplaceListingSelect }>;
