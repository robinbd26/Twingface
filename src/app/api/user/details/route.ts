import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeProfileSelect } from '@/lib/profile';
import { UpdateProfileDetailsSchema } from '@/lib/validations';

export async function PUT(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const input = UpdateProfileDetailsSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const profile = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        profession: input.data.profession,
        education: input.data.education,
        currentCity: input.data.currentCity,
        hometown: input.data.hometown,
      },
      select: safeProfileSelect,
    });
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Unable to update your details. Please try again.' }, { status: 500 });
  }
}
