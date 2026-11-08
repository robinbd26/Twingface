import { z } from 'zod';
import { ALL_DISTRICTS, DISTRICTS_BY_DIVISION, DIVISIONS } from './constants';
import { MediaWorldServiceCategorySchema } from './mediaworld';

export const SearchMediaWorldInputSchema = z
  .object({
    query: z.string().trim().max(120, 'Search query must be 120 characters or fewer.').optional(),
    division: z
      .string()
      .trim()
      .max(30)
      .refine((value) => value === '' || (DIVISIONS as readonly string[]).includes(value), 'Unknown division.')
      .optional(),
    district: z
      .string()
      .trim()
      .max(30)
      .refine((value) => value === '' || (ALL_DISTRICTS as readonly string[]).includes(value), 'Unknown district.')
      .optional(),
    category: MediaWorldServiceCategorySchema.optional(),
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive whole number.')
      .transform((value) => Math.min(Number(value), 60))
      .refine((value) => value >= 1, 'Limit must be at least 1.')
      .optional(),
    cursor: z.string().trim().min(1).max(40).optional(),
  })
  .default({})
  .superRefine((value, context) => {
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
  });

export type SearchMediaWorldInput = z.infer<typeof SearchMediaWorldInputSchema>;

// Casting requests, hiring posts and equipment rentals all reuse the
// existing marketplace messaging flow: the applicant messages the seller
// through POST /api/marketplace/[id]/message. These schemas validate the
// message content the UI composes for each intent.
const messageBody = (label: string) =>
  z.object({
    listingId: z.string().trim().min(1, 'Listing is required.').max(40, 'Listing id is too long.'),
    content: z
      .string()
      .trim()
      .min(10, `${label} message must be at least 10 characters.`)
      .max(2000, `${label} message must be 2,000 characters or fewer.`),
  });

export const CreateMediaWorldCastingRequestSchema = messageBody('Casting request');
export const CreateMediaWorldHiringInquirySchema = messageBody('Hiring inquiry');
export const CreateMediaWorldRentalInquirySchema = messageBody('Rental inquiry');

export type CreateMediaWorldCastingRequest = z.infer<typeof CreateMediaWorldCastingRequestSchema>;
