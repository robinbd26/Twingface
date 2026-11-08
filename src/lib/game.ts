import { z } from 'zod';

export const GameGenreSchema = z.enum(['ACTION', 'HORROR', 'RACING', 'PUZZLE_STRATEGY', 'SPORTS_FIGHTING', 'ARCADE', 'RPG']);
export const GAME_PAGE_LIMIT = 36;

function isDevelopmentHost(url: URL) {
  return process.env.NODE_ENV !== 'production' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
}

export function toEmbeddableGameUrl(value: string): string {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const isCrazyGamesPage =
      url.protocol === 'https:' &&
      (host === 'crazygames.com' || host.endsWith('.crazygames.com')) &&
      !host.startsWith('games.');
    if (isCrazyGamesPage) {
      const match = url.pathname.match(/^\/(?:game|embed)\/([a-z0-9-]+)/i);
      if (match) return `https://games.crazygames.com/en_US/${match[1].toLowerCase()}/index.html`;
    }
    return value;
  } catch {
    return value;
  }
}

export function isTrustedGameUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)) return false;
    const twingface = url.protocol === 'https:' && (url.hostname === 'games.twingface.com' || url.hostname.endsWith('.games.twingface.com'));
    const crazyGames = url.protocol === 'https:' && (url.hostname === 'crazygames.com' || url.hostname.endsWith('.crazygames.com'));
    return twingface || crazyGames || isDevelopmentHost(url);
  } catch { return false; }
}

const trustedGameUrlSchema = z.string().url().max(500).refine(isTrustedGameUrl, 'Use a trusted game domain.');
const imageUrlSchema = z.string().url().max(500).refine((value) => /^https?:\/\//.test(value), 'Use an HTTP(S) image URL.');

const gameFields = z.object({
  title: z.string().trim().min(3).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140),
  description: z.string().trim().min(10).max(1000),
  genre: GameGenreSchema,
  thumbnailUrl: imageUrlSchema,
  playUrl: trustedGameUrlSchema,
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  rating: z.number().min(0).max(5).optional(),
});

export function parseGameCreateInput(input: unknown) {
  const parsed = gameFields.safeParse(input);
  if (!parsed.success) return parsed;
  return { success: true as const, data: { ...parsed.data, playUrl: toEmbeddableGameUrl(parsed.data.playUrl) } };
}
export function parseGameUpdateInput(input: unknown) {
  const parsed = gameFields.partial().refine((value) => Object.keys(value).length > 0, 'Provide a game update.').safeParse(input);
  if (!parsed.success || !parsed.data.playUrl) return parsed;
  return { success: true as const, data: { ...parsed.data, playUrl: toEmbeddableGameUrl(parsed.data.playUrl) } };
}

export function parseGameBrowseInput(params: URLSearchParams) {
  const parsed = z.object({
    query: z.string().trim().max(80).optional().default(''),
    genre: GameGenreSchema.optional(),
    featured: z.enum(['true', 'false']).optional(),
  }).safeParse({ query: params.get('query') ?? '', genre: params.get('genre') || undefined, featured: params.get('featured') || undefined });
  return parsed.success ? { ...parsed.data, featured: parsed.data.featured === 'true' ? true : undefined } : { query: '', genre: undefined, featured: undefined };
}

export const safeGameSelect = { id: true, title: true, slug: true, description: true, genre: true, thumbnailUrl: true, playUrl: true, isFeatured: true, rating: true, playCount: true } as const;
export type SafeGame = { id: string; title: string; slug: string; description: string; genre: z.infer<typeof GameGenreSchema>; thumbnailUrl: string; playUrl: string; isFeatured: boolean; rating: number; playCount: number };
