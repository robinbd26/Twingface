import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeProfileSelect } from '@/lib/profile';
import { ProfileSchema } from '@/lib/validations';

export async function PATCH(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const parsed = ProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { name, bio, profileImage, coverImage } = parsed.data;
  try {
    const profile = await prisma.user.update({ where: { id: currentUser.id }, data: { name, bio, profileImage, coverImage }, select: safeProfileSelect });
    return NextResponse.json({ profile });
  } catch (error) { console.error('User profile update failed', error); return NextResponse.json({ error: 'Unable to update your profile. Please try again.' }, { status: 500 }); }
}
