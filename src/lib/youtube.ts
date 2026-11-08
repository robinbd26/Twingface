const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

export type YouTubeVideo = { videoId: string; canonicalUrl: string };

export function parseYouTubeUrl(value: unknown): YouTubeVideo | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  let url: URL;
  try { url = new URL(value.trim()); } catch { return null; }
  if (url.protocol !== 'https:') return null;

  let videoId: string | null = null;
  if (url.hostname === 'youtu.be') {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 1) videoId = parts[0];
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    if (url.pathname === '/watch') videoId = url.searchParams.get('v');
    if (url.pathname.startsWith('/embed/')) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length === 2 && parts[0] === 'embed') videoId = parts[1];
    }
  }
  if (!videoId || !VIDEO_ID.test(videoId)) return null;
  return { videoId, canonicalUrl: `https://www.youtube.com/watch?v=${videoId}` };
}

export function getYouTubeEmbedUrl(value: string | null | undefined): string | null {
  const parsed = parseYouTubeUrl(value);
  return parsed ? `https://www.youtube-nocookie.com/embed/${parsed.videoId}` : null;
}
