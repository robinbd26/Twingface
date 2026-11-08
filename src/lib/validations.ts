import { z } from 'zod';
import { ALL_DISTRICTS, DISTRICTS_BY_DIVISION, DIVISIONS, GENDERS, MIN_DOB_YEAR, PAGE_CATEGORIES } from './constants';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BD_MOBILE_RE = /^(\+?8801[3-9]\d{8}|01[3-9]\d{8})$/;

export const normalizedEmail = z.string().trim().toLowerCase().max(255, 'Email is too long.').email('Enter a valid email address.');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(1024, 'Password is too long.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/\d/, 'Password must include a number.');

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters.')
  .max(30)
  .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/, 'Use letters, numbers, dots, hyphens, or underscores.')
  .refine((value) => !/^(?:880|01)\d*$/.test(value), 'Choose a User ID that is not a phone number.');

export type LoginIdentifier =
  | { kind: 'email'; value: string }
  | { kind: 'phone'; value: string }
  | { kind: 'username'; value: string };

const optionalHttpsUrl = z
  .string()
  .trim()
  .max(500, 'Image URL is too long.')
  .refine((value) => value === '' || (() => { try { return new URL(value).protocol === 'https:'; } catch { return false; } })(), 'Use a valid HTTPS image URL.')
  .transform((value) => value || null);

export function normalizeContact(value: string): { email: string | null; phone: string | null } {
  const raw = value.trim();
  if (raw.includes('@')) return { email: raw.toLowerCase(), phone: null };
  const digits = raw.replace(/[\s\-()]/g, '');
  if (BD_MOBILE_RE.test(digits)) {
    const normalized = digits.startsWith('+') ? digits : digits.startsWith('880') ? `+${digits}` : `+880${digits.slice(1)}`;
    return { email: null, phone: normalized };
  }
  return { email: null, phone: null };
}

export function validateContact(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  if (raw.includes('@')) return EMAIL_RE.test(raw);
  return BD_MOBILE_RE.test(raw.replace(/[\s\-()]/g, ''));
}

export function parseLoginIdentifier(value: unknown): LoginIdentifier | null {
  if (typeof value !== 'string') return null;

  const raw = value.trim();
  if (!raw || raw.length > 255) return null;

  if (raw.includes('@')) {
    const email = normalizedEmail.safeParse(raw);
    return email.success ? { kind: 'email', value: email.data } : null;
  }

  const contact = normalizeContact(raw);
  if (contact.phone) return { kind: 'phone', value: contact.phone };
  if (/^(?:\+?880|01)\d*$/.test(raw.replace(/[\s\-()]/g, ''))) return null;

  const parsedUsername = username.safeParse(raw);
  return parsedUsername.success ? { kind: 'username', value: parsedUsername.data } : null;
}

const contact = z
  .string()
  .trim()
  .min(1, 'Email or mobile number is required.')
  .max(255, 'Contact is too long.')
  .refine(validateContact, 'Enter a valid email address or Bangladeshi mobile number.');

const gender = z.enum(GENDERS, { message: 'Please select your gender.' }).optional();

const currentYear = new Date().getFullYear();

const dobDay = z.coerce.number().int().min(1, 'Select a day.').max(31, 'Select a day.').optional();
const dobMonth = z.coerce.number().int().min(1, 'Select a month.').max(12, 'Select a month.').optional();
const dobYear = z.coerce
  .number()
  .int()
  .min(MIN_DOB_YEAR, `Year must be ${MIN_DOB_YEAR} or later.`)
  .max(currentYear, 'Year cannot be in the future.')
  .optional();

const division = z.enum(DIVISIONS, { message: 'Please select your division.' }).optional();

const district = z.string().trim().min(1, 'Please select your district.').max(30).refine((value) => (ALL_DISTRICTS as readonly string[]).includes(value), 'Please select a valid district.').optional();

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
    username,
    contact,
    gender,
    dobDay,
    dobMonth,
    dobYear,
    division,
    district,
    password,
    confirmPassword: z.string().max(1024, 'Password is too long.'),
  })
  .superRefine(({ password: value, confirmPassword, dobDay: day, dobMonth: month, dobYear: year, division: div, district: dist }, ctx) => {
    if (value !== confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match.' });
    }
    if (day && month && year) {
      const date = new Date(year, month - 1, day);
      const validDate = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
      if (!validDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dobDay'], message: 'Select a valid date of birth.' });
      } else {
        const ageMs = Date.now() - date.getTime();
        if (ageMs < 0 || ageMs / 31557600000 < 13) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dobYear'], message: 'You must be at least 13 years old.' });
        }
      }
    }
    if (div && dist) {
      const allowed = (DISTRICTS_BY_DIVISION as Record<string, readonly string[]>)[div];
      if (allowed && !(allowed as readonly string[]).includes(dist)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['district'], message: 'District does not belong to the selected division.' });
      }
    }
  });

const loginIdentifier = z
  .string()
  .trim()
  .min(1, 'Email, phone, or User ID is required.')
  .max(255, 'Login identifier is too long.')
  .transform((value, ctx) => {
    const identifier = parseLoginIdentifier(value);
    if (!identifier) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid email address, Bangladeshi mobile number, or User ID.' });
      return z.NEVER;
    }
    return identifier;
  });

export const loginSchema = z.object({ identifier: loginIdentifier, password: z.string().min(1, 'Password is required.').max(1024, 'Password is too long.') });

const requiredDivision = z.enum(DIVISIONS, { message: 'Please select your division.' });

const requiredDistrict = z
  .string()
  .trim()
  .min(1, 'Please select your district.')
  .max(30)
  .refine((value) => (ALL_DISTRICTS as readonly string[]).includes(value), 'Please select a valid district.');

const addressLine = z
  .string()
  .trim()
  .min(5, 'Address must be at least 5 characters.')
  .max(255, 'Address must be 255 characters or fewer.');

const bdMobile = z
  .string()
  .trim()
  .min(1, 'Mobile number is required.')
  .refine(
    (value) => BD_MOBILE_RE.test(value.replace(/[\s\-()]/g, '')),
    'Enter a valid Bangladeshi mobile number.',
  )
  .transform((value) => {
    const digits = value.replace(/[\s\-()]/g, '');
    return digits.startsWith('+') ? digits : digits.startsWith('880') ? `+${digits}` : `+880${digits.slice(1)}`;
  });

// The profile setup wizard registers a professional account directly, so it
// needs both contacts (login works with either) and a full address.
export const mediaWorldSignupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
    email: normalizedEmail,
    phone: bdMobile,
    password,
    confirmPassword: z.string().max(1024, 'Password is too long.'),
    division: requiredDivision,
    district: requiredDistrict,
    presentAddress: addressLine,
    bio: optionalTrimmedText(500, 'Bio must be 500 characters or fewer.').optional(),
  })
  .strict()
  .superRefine(({ password: value, confirmPassword, division: div, district: dist }, ctx) => {
    if (value !== confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match.' });
    }
    const allowed = DISTRICTS_BY_DIVISION[div];
    if (!(allowed as readonly string[]).includes(dist)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['district'], message: 'District does not belong to the selected division.' });
    }
  });

// A For Rent account is created in one pass: the same login details as a Media
// World sign-up plus the rental service fields, so a provider can open an
// account and start listing without the professional wizard.
export const rentalSignupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
    email: normalizedEmail,
    phone: bdMobile,
    password,
    confirmPassword: z.string().max(1024, 'Password is too long.'),
    division: requiredDivision,
    district: requiredDistrict,
    presentAddress: addressLine,
    ownerName: z.string().trim().min(2, 'Owner name must be at least 2 characters.').max(100),
    // A blank optional must not reach the provider row as an empty string — the
    // multipart reader cannot tell an omitted field from an empty one.
    businessName: z.string().trim().max(160, 'Business name must be 160 characters or fewer.').optional().transform((value) => value || undefined),
    location: z.string().trim().min(2, 'Service location is required.').max(160),
    fullAddress: z.string().trim().max(300, 'Full address must be 300 characters or fewer.').optional().transform((value) => value || undefined),
    description: z.string().trim().min(10, 'Description must be at least 10 characters.').max(2000),
  })
  .strict()
  .superRefine(({ password: value, confirmPassword, division: div, district: dist }, ctx) => {
    if (value !== confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match.' });
    }
    const allowed = DISTRICTS_BY_DIVISION[div];
    if (!(allowed as readonly string[]).includes(dist)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['district'], message: 'District does not belong to the selected division.' });
    }
  });

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
  username,
  bio: z.string().trim().max(500, 'Bio must be 500 characters or fewer.').transform((value) => value || null),
  profileImage: optionalHttpsUrl,
  coverImage: optionalHttpsUrl,
});

export const ProfileSchema = profileUpdateSchema;

function optionalTrimmedText(maxLength: number, message: string) {
  return z.string().trim().max(maxLength, message).transform((value) => value || null);
}

export const UpdateBioSchema = z.object({
  bio: optionalTrimmedText(500, 'Bio must be 500 characters or fewer.'),
}).strict();

export const UpdateProfileDetailsSchema = z.object({
  profession: optionalTrimmedText(100, 'Profession must be 100 characters or fewer.'),
  education: optionalTrimmedText(160, 'Education must be 160 characters or fewer.'),
  currentCity: optionalTrimmedText(120, 'Current city must be 120 characters or fewer.'),
  hometown: optionalTrimmedText(120, 'Hometown must be 120 characters or fewer.'),
}).strict();

const postContent = z.string().trim().min(1, 'Post content cannot be empty.').max(500, 'Post content must be 500 characters or fewer.');
export const postCreateContent = z.string().trim().max(500, 'Post content must be 500 characters or fewer.').optional().default('');

export const CreatePostSchema = z.object({ content: postContent });
export const UpdatePostSchema = z.object({ content: postContent });
export const CreateCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty.').max(500, 'Comment must be 500 characters or fewer.'),
});

const pageName = z.string().trim().min(2, 'Page name must be at least 2 characters.').max(100);

const pageHandle = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Handle must be at least 3 characters.')
  .max(30)
  .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/, 'Use letters, numbers, dots, hyphens, or underscores.');

const pageCategory = z.enum(PAGE_CATEGORIES, { message: 'Please select a category.' });

const pageBio = z.string().trim().max(500, 'Bio must be 500 characters or fewer.').transform((value) => value || null);

export const CreatePageSchema = z.object({ name: pageName, handle: pageHandle, category: pageCategory, bio: pageBio });

export const UpdatePageSchema = z.object({ name: pageName, handle: pageHandle, category: pageCategory, bio: pageBio });

export const CreatePagePostSchema = z.object({ content: postContent });

const groupName = z.string().trim().min(3, 'Group name must be at least 3 characters.').max(80, 'Group name must be 80 characters or fewer.');
const groupHandle = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Group handle must be at least 3 characters.')
  .max(60, 'Group handle must be 60 characters or fewer.')
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Use lowercase letters, numbers, and hyphens.');
const groupDescription = z.string().trim().max(500, 'Description must be 500 characters or fewer.').optional().transform((value) => value || null);
const groupPrivacy = z.enum(['PUBLIC', 'PRIVATE']);
const groupPostingPolicy = z.enum(['MEMBERS', 'ADMINS_ONLY']);
const groupCoverImage = z.union([optionalHttpsUrl, z.null()]).optional().default(null);

export const CreateGroupSchema = z.object({
  name: groupName,
  handle: groupHandle,
  description: groupDescription,
  privacy: groupPrivacy,
  postingPolicy: groupPostingPolicy,
  coverImage: groupCoverImage,
}).strict();

export const UpdateGroupSchema = z.object({
  name: groupName.optional(),
  description: groupDescription.optional(),
  privacy: groupPrivacy.optional(),
  postingPolicy: groupPostingPolicy.optional(),
  coverImage: groupCoverImage.optional(),
}).strict();

export const GroupMemberActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'remove']),
}).strict();

const listingTitle = z.string().trim().min(3, 'Title must be at least 3 characters.').max(120, 'Title must be 120 characters or fewer.');
const listingPrice = z.coerce.number().int('Price must be a whole number.').min(0, 'Price cannot be negative.').max(1000000000, 'Price is too large.');
const listingDescription = z.string().trim().max(1000, 'Description must be 1000 characters or fewer.').optional().transform((value) => value || null);
const listingCategory = z.string().trim().min(1, 'Please select a category.').max(40, 'Category is too long.');
const listingCondition = z.enum(['NEW', 'USED_LIKE_NEW', 'USED_GOOD', 'USED_FAIR']);
const listingStatus = z.enum(['AVAILABLE', 'SOLD']);
const listingLocation = z.string().trim().max(120, 'Location must be 120 characters or fewer.').optional().transform((value) => value || null);
const listingImageUrl = z.union([optionalHttpsUrl, z.null()]).optional().default(null);

export const CreateListingSchema = z.object({
  title: listingTitle,
  price: listingPrice,
  description: listingDescription,
  category: listingCategory,
  condition: listingCondition,
  location: listingLocation,
  imageUrl: listingImageUrl,
}).strict();

export const UpdateListingSchema = z.object({
  title: listingTitle.optional(),
  price: listingPrice.optional(),
  description: listingDescription.optional(),
  category: listingCategory.optional(),
  condition: listingCondition.optional(),
  status: listingStatus.optional(),
  location: listingLocation.optional(),
  imageUrl: listingImageUrl.optional(),
}).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type MediaWorldSignupInput = z.infer<typeof mediaWorldSignupSchema>;

export const mediaWorldPersonalSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
    email: normalizedEmail,
    phone: bdMobile,
    division: requiredDivision,
    district: requiredDistrict,
    presentAddress: addressLine,
    bio: optionalTrimmedText(500, 'Bio must be 500 characters or fewer.').optional(),
  })
  .strict()
  .superRefine(({ division: div, district: dist }, ctx) => {
    const allowed = DISTRICTS_BY_DIVISION[div];
    if (!(allowed as readonly string[]).includes(dist)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['district'], message: 'District does not belong to the selected division.' });
    }
  });

export type MediaWorldPersonalInput = z.infer<typeof mediaWorldPersonalSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type UpdateBioInput = z.infer<typeof UpdateBioSchema>;
export type UpdateProfileDetailsInput = z.infer<typeof UpdateProfileDetailsSchema>;
export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type CreatePageInput = z.infer<typeof CreatePageSchema>;
export type UpdatePageInput = z.infer<typeof UpdatePageSchema>;
export type CreatePagePostInput = z.infer<typeof CreatePagePostSchema>;
export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
export type UpdateGroupInput = z.infer<typeof UpdateGroupSchema>;
export type GroupMemberActionInput = z.infer<typeof GroupMemberActionSchema>;
export type CreateListingInput = z.infer<typeof CreateListingSchema>;
export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;

export function validateEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

export function validateName(name: string): boolean {
  return name.trim().length >= 2;
}

export function validatePost(content: string): ValidationResult {
  const errors: string[] = [];
  if (!content.trim()) errors.push('Post cannot be empty');
  if (content.length > 500) errors.push('Post is too long');
  return { valid: errors.length === 0, errors };
}
