import { z } from 'zod';

export const MediaAccountTypeSchema = z.enum(['PROFESSIONAL', 'BUSINESS', 'RENTAL']);
export type MediaAccountTypeInput = z.infer<typeof MediaAccountTypeSchema>;

export const ChooseAccountTypeSchema = z.object({
  accountType: MediaAccountTypeSchema,
});

const optionalShortText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

const optionalEmail = z
  .string()
  .trim()
  .max(255, 'Email is too long.')
  .email('Enter a valid email address.')
  .optional()
  .or(z.literal('').transform(() => undefined));

const optionalUrl = z
  .string()
  .trim()
  .max(500, 'Website must be 500 characters or fewer.')
  .url('Enter a valid website URL.')
  // z.url() only checks that new URL() parses, so javascript: and data: pass it; this value is rendered as an <a href>.
  .refine((value) => /^https?:\/\//i.test(value), 'Enter a website starting with http:// or https://.')
  .optional()
  .or(z.literal('').transform(() => undefined));

export const AddProfessionalIdentitySchema = z.object({
  industryId: z.string().trim().min(1, 'Industry is required.').max(40),
  mainCategoryId: z.string().trim().min(1, 'Category is required.').max(40),
  designationId: z.string().trim().min(1, 'Designation is required.').max(40),
});
export type AddProfessionalIdentityInput = z.infer<typeof AddProfessionalIdentitySchema>;

export const MAX_PROFESSIONAL_IDENTITIES = 20;

export const OrganizationProfileSchema = z.object({
  orgTypeId: z.string().trim().min(1, 'Organization type is required.').max(40),
  orgName: z.string().trim().min(2, 'Organization name must be at least 2 characters.').max(160),
  contactName: z.string().trim().min(2, 'Contact name must be at least 2 characters.').max(100),
  phone: optionalShortText(20, 'Phone number'),
  email: optionalEmail,
  address: optionalShortText(300, 'Address'),
  city: optionalShortText(120, 'City'),
  description: optionalShortText(2000, 'Description'),
  website: optionalUrl,
});
export type OrganizationProfileInput = z.infer<typeof OrganizationProfileSchema>;

export const RentalProviderProfileSchema = z.object({
  ownerName: z.string().trim().min(2, 'Owner name must be at least 2 characters.').max(100),
  businessName: optionalShortText(160, 'Business name'),
  phone: z.string().trim().min(6, 'Phone number is required.').max(20, 'Phone number must be 20 characters or fewer.'),
  email: optionalEmail,
  location: z.string().trim().min(2, 'Location is required.').max(160),
  fullAddress: optionalShortText(300, 'Full address'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters.').max(2000),
});
export type RentalProviderProfileInput = z.infer<typeof RentalProviderProfileSchema>;
