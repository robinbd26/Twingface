import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { TalentProfileDetailsSchema } from '@/lib/mediaworld/showcase';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const parsed = TalentProfileDetailsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { accountType: true } });
  if (!account) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  if (!account.accountType) {
    return NextResponse.json({ error: 'Talent profile details are available for Media World accounts.' }, { status: 403 });
  }

  const data = parsed.data;
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        bio: data.bio || null,
        division: data.division || null,
        district: data.district || null,
        presentAddress: data.presentAddress || null,
      },
    });
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error('[mediaworld/profile/details PATCH] error:', error);
    return NextResponse.json({ error: 'Unable to save your profile details.' }, { status: 500 });
  }
}
