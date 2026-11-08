import { z } from 'zod';
import { DISTRICTS_BY_DIVISION, DIVISIONS } from '@/lib/constants';

export const MAX_SHOWCASE_PHOTOS = 10;
export const MAX_SHOWCASE_VIDEOS = 5;
export const MAX_SHOWCASE_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_SHOWCASE_TITLE = 120;
export const MAX_SOCIAL_URL = 300;
export const MAX_TALENT_RATE = 100_000_000;

export const SHOWCASE_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export const SHOWCASE_KINDS = ['PHOTO', 'VIDEO'] as const;
export type ShowcaseKind = (typeof SHOWCASE_KINDS)[number];

const BD_MOBILE_RE = /^\+?8801[3-9]\d{8}$/;
// Owners usually type the local form; normaliseWhatsapp rewrites it to +880 before storage.
const BD_MOBILE_INPUT_RE = /^(?:\+?880|0)1[3-9]\d{8}$/;

function optionalUrl(value: string): boolean {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

const socialUrl = z
  .string()
  .trim()
  .max(MAX_SOCIAL_URL)
  .refine(optionalUrl, 'Enter a full http(s) link.');

const rateField = z
  .number()
  .int('Use a whole number.')
  .min(0, 'Rates cannot be negative.')
  .max(MAX_TALENT_RATE, 'That rate is too high.')
  .nullable();

const divisionField = z
  .string()
  .trim()
  .max(30)
  .refine((value) => value === '' || (DIVISIONS as readonly string[]).includes(value), 'Unknown division.');

const districtField = z
  .string()
  .trim()
  .max(30)
  .refine((value) => value === '' || Object.values(DISTRICTS_BY_DIVISION).some((list) => list.includes(value)), 'Unknown district.');

const detailsShape = {
  bio: z.string().trim().max(500, 'Keep your bio under 500 characters.'),
  division: divisionField,
  district: districtField,
  presentAddress: z.string().trim().max(255, 'Keep the present address under 255 characters.'),
};

function requireDistrictInDivision(value: { division: string; district: string }, context: z.RefinementCtx) {
  if (!value.district) return;
  if (!value.division) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['division'], message: 'Select your division for that district.' });
    return;
  }
  if (!(DISTRICTS_BY_DIVISION[value.division as keyof typeof DISTRICTS_BY_DIVISION] ?? []).includes(value.district)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['district'], message: 'Select a district inside your division.' });
  }
}

export const TalentProfileDetailsSchema = z
  .object(detailsShape)
  .strict()
  .superRefine(requireDistrictInDivision);

export type TalentProfileDetailsInput = z.infer<typeof TalentProfileDetailsSchema>;

export const TalentSettingsSchema = z
  .object({
    whatsapp: z
      .string()
      .trim()
      .max(20)
      .refine((value) => value === '' || BD_MOBILE_INPUT_RE.test(value.replace(/[\s\-()]/g, '')), 'Enter a valid Bangladeshi WhatsApp number.'),
    youtubeUrl: socialUrl,
    facebookUrl: socialUrl,
    instagramUrl: socialUrl,
    tiktokUrl: socialUrl,
    websiteUrl: socialUrl,
    ratePerDay: rateField,
    ratePerWeek: rateField,
    ratePerMonth: rateField,
    showPhone: z.boolean(),
    showEmail: z.boolean(),
    showAddress: z.boolean(),
    showWhatsapp: z.boolean(),
    showRates: z.boolean(),
  })
  .strict();

export type TalentSettingsInput = z.infer<typeof TalentSettingsSchema>;

export const TalentProfileSettingsSchema = z
  .object({ ...detailsShape, ...TalentSettingsSchema.shape })
  .strict()
  .superRefine(requireDistrictInDivision);

export type TalentProfileSettingsInput = z.infer<typeof TalentProfileSettingsSchema>;

export const ShowcaseVideoSchema = z
  .object({
    url: z
      .string()
      .trim()
      .min(1, 'Paste a video link.')
      .max(500, 'Keep the link under 500 characters.')
      .refine(optionalUrl, 'Enter a full http(s) link.'),
    title: z.string().trim().max(MAX_SHOWCASE_TITLE).optional(),
  })
  .strict();

export const ShowcaseUpdateSchema = z
  .object({
    title: z.string().trim().max(MAX_SHOWCASE_TITLE).optional(),
    url: z
      .string()
      .trim()
      .max(500, 'Keep the link under 500 characters.')
      .refine((value) => value === '' || optionalUrl(value), 'Enter a full http(s) link.')
      .optional(),
  })
  .strict();

export type ShowcaseUpdateInput = z.infer<typeof ShowcaseUpdateSchema>;

/** Trims the value and keeps only full http(s) links; anything else becomes empty. */
export function normaliseSocialUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return optionalUrl(trimmed) ? trimmed : '';
}

export function normaliseWhatsapp(value: string): string {
  const trimmed = value.replace(/[\s\-()]/g, '');
  if (!trimmed) return '';
  const withCountry = trimmed.startsWith('880') ? `+${trimmed}` : trimmed.startsWith('0') ? `+880${trimmed.slice(1)}` : trimmed;
  return BD_MOBILE_RE.test(withCountry) ? withCountry : '';
}

function youTubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
  if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null;
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') return url.searchParams.get('v');
    const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]+)/);
    return match?.[1] ?? null;
  }
  return null;
}

function vimeoId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '');
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
  const match = url.pathname.match(/(\d{5,})/);
  return match?.[1] ?? null;
}

/** Only YouTube and Vimeo get an inline player; other links open in a new tab. */
export function showcaseVideoEmbed(rawUrl: string): { provider: 'youtube' | 'vimeo'; src: string } | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const youtube = youTubeId(url);
  if (youtube) return { provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtube)}` };

  const vimeo = vimeoId(url);
  if (vimeo) return { provider: 'vimeo', src: `https://player.vimeo.com/video/${encodeURIComponent(vimeo)}` };

  return null;
}

export function showcaseVideoHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** YouTube serves a predictable poster image; Vimeo and other hosts fall back to a plain thumbnail tile. */
export function showcaseVideoThumbnail(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const id = youTubeId(url);
  return id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : null;
}

export const SOCIAL_LINK_KEYS = ['youtubeUrl', 'facebookUrl', 'instagramUrl', 'tiktokUrl', 'websiteUrl'] as const;
export type SocialLinkKey = (typeof SOCIAL_LINK_KEYS)[number];

export type PrivacyField = 'phone' | 'email' | 'address' | 'whatsapp' | 'rates';

export const PRIVACY_TOGGLES: Record<PrivacyField, 'showPhone' | 'showEmail' | 'showAddress' | 'showWhatsapp' | 'showRates'> = {
  phone: 'showPhone',
  email: 'showEmail',
  address: 'showAddress',
  whatsapp: 'showWhatsapp',
  rates: 'showRates',
};

export type TalentPrivacyView = {
  showPhone: boolean;
  showEmail: boolean;
  showAddress: boolean;
  showWhatsapp: boolean;
  showRates: boolean;
};

export const DEFAULT_PRIVACY: TalentPrivacyView = {
  showPhone: false,
  showEmail: false,
  showAddress: false,
  showWhatsapp: false,
  showRates: true,
};

/** The owner always sees their own data; everyone else is filtered server-side before rendering. */
export function canReveal(field: PrivacyField, privacy: TalentPrivacyView, isOwner: boolean): boolean {
  return isOwner || privacy[PRIVACY_TOGGLES[field]];
}

export function formatRate(value: number | null | undefined, currency = 'BDT'): string {
  if (value === null || value === undefined) return '';
  const prefix = currency === 'BDT' ? '৳' : `${currency} `;
  return `${prefix}${value.toLocaleString('en-US')}`;
}
