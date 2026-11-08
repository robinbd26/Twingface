import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  normaliseSocialUrl,
  normaliseWhatsapp,
  TalentSettingsSchema,
} from '@/lib/mediaworld/showcase';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const parsed = TalentSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { accountType: true } });
  if (!account) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  if (!account.accountType) {
    return NextResponse.json({ error: 'Talent profile settings are available for Media World accounts.' }, { status: 403 });
  }

  const data = parsed.data;
  const settingsData = {
    whatsapp: normaliseWhatsapp(data.whatsapp) || null,
    youtubeUrl: normaliseSocialUrl(data.youtubeUrl) || null,
    facebookUrl: normaliseSocialUrl(data.facebookUrl) || null,
    instagramUrl: normaliseSocialUrl(data.instagramUrl) || null,
    tiktokUrl: normaliseSocialUrl(data.tiktokUrl) || null,
    websiteUrl: normaliseSocialUrl(data.websiteUrl) || null,
    ratePerDay: data.ratePerDay ?? null,
    ratePerWeek: data.ratePerWeek ?? null,
    ratePerMonth: data.ratePerMonth ?? null,
    showPhone: data.showPhone,
    showEmail: data.showEmail,
    showAddress: data.showAddress,
    showWhatsapp: data.showWhatsapp,
    showRates: data.showRates,
  };

  try {
    await prisma.talentProfileSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...settingsData },
      update: settingsData,
    });
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error('[mediaworld/profile/talent PATCH] error:', error);
    return NextResponse.json({ error: 'Unable to save your profile settings.' }, { status: 500 });
  }
}
