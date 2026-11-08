import { describe, expect, it } from 'vitest';
import {
  isValidProfileMediaBytes,
  isValidProfileMediaFile,
  MAX_PROFILE_MEDIA_BYTES,
  ProfileMediaKindSchema,
} from './profile-media';

const signatures: Record<string, Uint8Array> = {
  'image/jpeg': new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
  'image/png': new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/webp': new TextEncoder().encode('RIFFxxxxWEBP'),
  'image/gif': new TextEncoder().encode('GIF89a'),
};

describe('profile media validation', () => {
  it.each(Object.entries(signatures))('accepts a supported %s file at the 5 MiB limit', (mimeType, bytes) => {
    const file = new File([new Uint8Array(MAX_PROFILE_MEDIA_BYTES)], 'photo', { type: mimeType });

    expect(isValidProfileMediaFile(file)).toBe(true);
    expect(isValidProfileMediaBytes(mimeType, bytes)).toBe(true);
  });

  it('rejects an unsupported type and a file above the size limit', () => {
    expect(isValidProfileMediaFile(new File(['plain text'], 'note.txt', { type: 'text/plain' }))).toBe(false);
    expect(isValidProfileMediaFile(new File([new Uint8Array(MAX_PROFILE_MEDIA_BYTES + 1)], 'large.png', { type: 'image/png' }))).toBe(false);
  });

  it('rejects renamed data whose bytes do not match the claimed MIME type', () => {
    expect(isValidProfileMediaBytes('image/jpeg', new TextEncoder().encode('not an image'))).toBe(false);
    expect(isValidProfileMediaBytes('image/png', signatures['image/jpeg'])).toBe(false);
  });

  it('allows only the profile and cover media kinds', () => {
    expect(ProfileMediaKindSchema.safeParse('profile').success).toBe(true);
    expect(ProfileMediaKindSchema.safeParse('cover').success).toBe(true);
    expect(ProfileMediaKindSchema.safeParse('avatar').success).toBe(false);
  });
});
