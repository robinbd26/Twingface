import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeProfileSelect } from '@/lib/profile';
import { profileUpdateSchema } from '@/lib/validations';

export async function PATCH(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const parsed = profileUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  try {
    const profile = await prisma.user.update({ where: { id: currentUser.id }, data: parsed.data, select: safeProfileSelect });
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'That username is already in use.', fields: { username: ['That username is already in use.'] } }, { status: 409 });
    console.error('Profile update failed', error);
    return NextResponse.json({ error: 'Unable to update your profile. Please try again.' }, { status: 500 });
  }
}
