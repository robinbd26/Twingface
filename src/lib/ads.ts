import type { Prisma } from '@prisma/client';

export const DEFAULT_ADS_PER_PAGE = 5;
export const MAX_ADS_PER_PAGE = 20;

export const safeAdSelect = {
  id: true,
  title: true,
  description: true,
  imageUrl: true,
  destinationUrl: true,
  createdAt: true,
} satisfies Prisma.AdSelect;

export function parseAdLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_ADS_PER_PAGE;
  return Math.min(parsed, MAX_ADS_PER_PAGE);
}

// Derive a short domain label (e.g. "elevenlabs.io") from a destination URL.
export function adDomain(destinationUrl: string): string {
  try {
    return new URL(destinationUrl).hostname.replace(/^www\./, '');
  } catch {
    return destinationUrl;
  }
}
