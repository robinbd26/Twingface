import { z } from 'zod';

export const MAX_PROFILE_MEDIA_BYTES = 5 * 1024 * 1024;
export const PROFILE_MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const PROFILE_MEDIA_KINDS = ['profile', 'cover'] as const;

export const ProfileMediaKindSchema = z.enum(PROFILE_MEDIA_KINDS);
export type ProfileMediaKind = z.infer<typeof ProfileMediaKindSchema>;

export function isProfileMediaFile(value: unknown): value is File {
  return typeof value === 'object'
    && value !== null
    && 'size' in value
    && 'type' in value
    && 'arrayBuffer' in value
    && typeof value.arrayBuffer === 'function';
}

export function isValidProfileMediaFile(file: File): boolean {
  return PROFILE_MEDIA_MIME_TYPES.includes(file.type as (typeof PROFILE_MEDIA_MIME_TYPES)[number])
    && file.size <= MAX_PROFILE_MEDIA_BYTES;
}

export function isValidProfileMediaBytes(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  if (mimeType === 'image/gif') return bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(new TextDecoder().decode(bytes.slice(0, 6)));
  if (mimeType === 'image/webp') return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  return false;
}
