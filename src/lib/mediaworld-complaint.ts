import { z } from 'zod';

export const MAX_COMPLAINT_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_COMPLAINT_VIDEO_BYTES = 25 * 1024 * 1024;
export const MAX_COMPLAINT_ATTACHMENTS = 6;

export const COMPLAINT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const COMPLAINT_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'] as const;

export const MediaComplaintPersonTypeSchema = z.enum([
  'ACTOR',
  'ACTRESS',
  'CAMERAMAN',
  'DIRECTOR',
  'MODEL',
  'CREW',
  'OTHER',
]);

export type MediaComplaintPersonType = z.infer<typeof MediaComplaintPersonTypeSchema>;

export const MEDIA_COMPLAINT_PERSON_LABELS: Record<MediaComplaintPersonType, { bn: string; en: string }> = {
  ACTOR: { bn: 'অ্যাক্টর', en: 'Actor' },
  ACTRESS: { bn: 'অ্যাক্ট্রেস', en: 'Actress' },
  CAMERAMAN: { bn: 'ক্যামারাম্যান', en: 'Cameraman' },
  DIRECTOR: { bn: 'ডিরেক্টর', en: 'Director' },
  MODEL: { bn: 'মডেল', en: 'Model' },
  CREW: { bn: 'ক্রু', en: 'Crew member' },
  OTHER: { bn: 'অন্যান্য', en: 'Other' },
};

export function isFileLike(value: unknown): value is File {
  return typeof value === 'object'
    && value !== null
    && 'size' in value
    && 'type' in value
    && 'arrayBuffer' in value
    && typeof value.arrayBuffer === 'function';
}

export function isComplaintImageFile(file: File): boolean {
  return COMPLAINT_IMAGE_MIME_TYPES.includes(file.type as (typeof COMPLAINT_IMAGE_MIME_TYPES)[number])
    && file.size <= MAX_COMPLAINT_IMAGE_BYTES;
}

export function isComplaintVideoFile(file: File): boolean {
  return COMPLAINT_VIDEO_MIME_TYPES.includes(file.type as (typeof COMPLAINT_VIDEO_MIME_TYPES)[number])
    && file.size <= MAX_COMPLAINT_VIDEO_BYTES;
}

export function complaintAttachmentKind(file: File): 'IMAGE' | 'VIDEO' {
  return file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
}

function isValidImageBytes(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  if (mimeType === 'image/gif') return bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(new TextDecoder().decode(bytes.slice(0, 6)));
  if (mimeType === 'image/webp') return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  return false;
}

function isValidVideoBytes(mimeType: string, bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const container = new TextDecoder().decode(bytes.slice(4, 8));
  if (mimeType === 'video/mp4' || mimeType === 'video/x-m4v') return container === 'ftyp';
  if (mimeType === 'video/quicktime') return container === 'ftyp' || container === 'moov' || container === 'mdat' || container === 'wide';
  if (mimeType === 'video/webm') return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  return false;
}

export function isValidComplaintAttachmentBytes(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType.startsWith('video/')) return isValidVideoBytes(mimeType, bytes);
  return isValidImageBytes(mimeType, bytes);
}

export const MediaComplaintFieldsSchema = z.object({
  subject: z.string().trim().min(3, 'Subject must be 3-120 characters.').max(120, 'Subject must be 120 characters or fewer.'),
  details: z.string().trim().min(10, 'Details must be 10-2000 characters.').max(2000, 'Details must be 2,000 characters or fewer.'),
  contact: z.string().trim().max(120, 'Contact must be 120 characters or fewer.').optional().default(''),
  personType: MediaComplaintPersonTypeSchema.optional().default('OTHER'),
  personName: z.string().trim().max(120, 'Person name must be 120 characters or fewer.').optional().default(''),
});

export type MediaComplaintFieldsInput = z.infer<typeof MediaComplaintFieldsSchema>;

export function parseMediaComplaintFields(input: unknown) {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  return MediaComplaintFieldsSchema.safeParse({
    subject: typeof source.subject === 'string' ? source.subject : '',
    details: typeof source.details === 'string' ? source.details : '',
    contact: typeof source.contact === 'string' ? source.contact : '',
    personType: typeof source.personType === 'string' ? source.personType : 'OTHER',
    personName: typeof source.personName === 'string' ? source.personName : '',
  });
}

export function parseMediaComplaintAttachments(formData: FormData) {
  const entries = formData.getAll('attachments').filter(isFileLike);
  const errors: string[] = [];
  if (entries.length > MAX_COMPLAINT_ATTACHMENTS) {
    errors.push(`You can attach up to ${MAX_COMPLAINT_ATTACHMENTS} files.`);
  }
  const attachments = entries.filter((file) => {
    if (file.type.startsWith('video/')) {
      if (!isComplaintVideoFile(file)) {
        errors.push('Videos must be MP4, WebM, MOV or M4V and 25 MB or smaller.');
        return false;
      }
      return true;
    }
    if (!isComplaintImageFile(file)) {
      errors.push('Images must be JPEG, PNG, WebP or GIF and 5 MB or smaller.');
      return false;
    }
    return true;
  });
  return { attachments, errors };
}
