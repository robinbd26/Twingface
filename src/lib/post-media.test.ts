import { describe, expect, it } from 'vitest';
import { MAX_POST_IMAGE_BYTES, isValidPostImage, isValidPostImageBytes, parseCreatePostInput } from './post-media';

const image = (type = 'image/jpeg', size = 1) => new File([new Uint8Array(size)], 'photo.jpg', { type });

describe('post media validation', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])('accepts an allowed %s image within 5 MiB', (type) => {
    expect(isValidPostImage(image(type, MAX_POST_IMAGE_BYTES))).toBe(true);
  });

  it('rejects invalid types and files over 5 MiB', () => {
    expect(isValidPostImage(image('application/pdf'))).toBe(false);
    expect(isValidPostImage(image('image/png', MAX_POST_IMAGE_BYTES + 1))).toBe(false);
  });

  it('accepts only image bytes that match the claimed MIME type', () => {
    expect(isValidPostImageBytes('image/jpeg', new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(isValidPostImageBytes('image/png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(isValidPostImageBytes('image/gif', new TextEncoder().encode('GIF89a'))).toBe(true);
    expect(isValidPostImageBytes('image/webp', new TextEncoder().encode('RIFF1234WEBP'))).toBe(true);
    expect(isValidPostImageBytes('image/jpeg', new TextEncoder().encode('not an image'))).toBe(false);
  });

  it('accepts image-only, text-only, and text-plus-image post input', () => {
    expect(parseCreatePostInput(null, image(), null)).toMatchObject({ success: true, data: { feelingActivity: null } });
    expect(parseCreatePostInput('  Hello Twingface  ', null, null)).toMatchObject({ success: true, data: { content: 'Hello Twingface', image: null, feelingActivity: null } });
    expect(parseCreatePostInput(' Hello ', image('image/png'), null)).toMatchObject({ success: true, data: { content: 'Hello', feelingActivity: null } });
  });

  it('accepts a supported selection but does not let it create an otherwise empty post', () => {
    expect(parseCreatePostInput(' Hello ', null, 'feeling:happy')).toMatchObject({ success: true, data: { content: 'Hello', feelingActivity: 'feeling:happy' } });
    expect(parseCreatePostInput(null, image(), 'activity:watching')).toMatchObject({ success: true, data: { feelingActivity: 'activity:watching' } });
    expect(parseCreatePostInput(null, null, 'feeling:happy').success).toBe(false);
  });

  it('allows a video-only post and canonicalizes a YouTube URL', () => {
    expect(parseCreatePostInput(null, null, null, 'https://youtu.be/dQw4w9WgXcQ')).toMatchObject({ success: true, data: { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
    expect(parseCreatePostInput(null, null, null, 'https://example.com/watch?v=dQw4w9WgXcQ').success).toBe(false);
  });

  it('rejects an unknown selection', () => {
    const result = parseCreatePostInput('Hello', null, 'feeling:admin');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.feelingActivity).toContain('Choose a valid feeling or activity.');
  });

  it('rejects a post without meaningful text or an image', () => {
    const result = parseCreatePostInput('   ', null);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.content).toContain('Write something, add an image, or share a video.');
  });
});
