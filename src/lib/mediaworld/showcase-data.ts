import type { Prisma } from '@prisma/client';

export const showcaseItemSelect = {
  id: true,
  kind: true,
  url: true,
  title: true,
  position: true,
  createdAt: true,
} satisfies Prisma.TalentShowcaseItemSelect;

export type ShowcaseItemView = Prisma.TalentShowcaseItemGetPayload<{ select: typeof showcaseItemSelect }>;

export const talentSettingsSelect = {
  whatsapp: true,
  youtubeUrl: true,
  facebookUrl: true,
  instagramUrl: true,
  tiktokUrl: true,
  websiteUrl: true,
  ratePerDay: true,
  ratePerWeek: true,
  ratePerMonth: true,
  currency: true,
  showPhone: true,
  showEmail: true,
  showAddress: true,
  showWhatsapp: true,
  showRates: true,
} satisfies Prisma.TalentProfileSettingsSelect;

export type TalentSettingsView = Prisma.TalentProfileSettingsGetPayload<{ select: typeof talentSettingsSelect }>;
