import { describe, expect, it } from 'vitest';
import { getYouTubeEmbedUrl, parseYouTubeUrl } from './youtube';

const id = 'dQw4w9WgXcQ';
const canonicalUrl = `https://www.youtube.com/watch?v=${id}`;

describe('YouTube URL parsing', () => {
  it.each([
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://www.youtube.com/embed/${id}`,
  ])('normalizes supported URL %s', (value) => {
    expect(parseYouTubeUrl(value)).toEqual({ videoId: id, canonicalUrl });
  });

  it.each(['http://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://example.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/playlist?list=abc', 'https://youtu.be/invalid', 'https://youtu.be/dQw4w9WgXcQ/extra'])('rejects unsafe or unsupported URL %s', (value) => {
    expect(parseYouTubeUrl(value)).toBeNull();
  });

  it('constructs only the privacy-enhanced embed URL from a valid stored URL', () => {
    expect(getYouTubeEmbedUrl(canonicalUrl)).toBe(`https://www.youtube-nocookie.com/embed/${id}`);
    expect(getYouTubeEmbedUrl('https://attacker.example/frame')).toBeNull();
  });
});
