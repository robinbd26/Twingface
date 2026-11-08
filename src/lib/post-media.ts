import { z } from 'zod';
import { FeelingActivityKeySchema } from './feeling-activity';
import { postCreateContent } from './validations';
import { parseYouTubeUrl } from './youtube';

export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024;
export const POST_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export type CreatePostMediaInput = {
  content: string;
  image: File | null;
  feelingActivity: string | null;
  youtubeUrl: string | null;
};

function isFileLike(value: unknown): value is File {
  return typeof value === 'object'
    && value !== null
    && 'size' in value
    && 'type' in value
    && 'arrayBuffer' in value
    && typeof value.arrayBuffer === 'function';
}

export function isValidPostImage(file: File): boolean {
  return POST_IMAGE_MIME_TYPES.includes(file.type as (typeof POST_IMAGE_MIME_TYPES)[number])
    && file.size <= MAX_POST_IMAGE_BYTES;
}

export function isValidPostImageBytes(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  if (mimeType === 'image/gif') return bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(new TextDecoder().decode(bytes.slice(0, 6)));
  if (mimeType === 'image/webp') return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  return false;
}

const createPostMediaSchema = z.object({
  content: postCreateContent,
  image: z.custom<File | null>((value) => value === null || isFileLike(value), 'Select a valid image file.'),
  feelingActivity: FeelingActivityKeySchema,
  youtubeUrl: z.union([z.string(), z.null()]).transform((value, context) => {
    if (value === null || !value.trim()) return null;
    const parsed = parseYouTubeUrl(value);
    if (!parsed) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid YouTube URL.' });
      return z.NEVER;
    }
    return parsed.canonicalUrl;
  }),
}).superRefine(({ content, image, youtubeUrl }, context) => {
  if (image && !POST_IMAGE_MIME_TYPES.includes(image.type as (typeof POST_IMAGE_MIME_TYPES)[number])) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['image'], message: 'Choose a JPEG, PNG, WebP, or GIF image.' });
  }
  if (image && image.size > MAX_POST_IMAGE_BYTES) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['image'], message: 'Image must be 5 MB or smaller.' });
  }
  if (!content && !image && !youtubeUrl) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['content'], message: 'Write something, add an image, or share a video.' });
  }
});

export function parseCreatePostInput(content: FormDataEntryValue | null, image: FormDataEntryValue | null, feelingActivity: unknown = null, youtubeUrl: unknown = null) {
  return createPostMediaSchema.safeParse({ content: content ?? undefined, image: image ?? null, feelingActivity, youtubeUrl });
}
