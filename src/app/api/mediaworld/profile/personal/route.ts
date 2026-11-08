import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { mediaWorldPersonalSchema } from '@/lib/validations';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const parsed = mediaWorldPersonalSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: parsed.data,
        select: {
          name: true,
          email: true,
          phone: true,
          division: true,
          district: true,
          presentAddress: true,
          bio: true,
        },
      });
      return NextResponse.json({ user: updated });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raw = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target ?? '');
        const field = raw.includes('phone') ? 'phone' : 'email';
        const message = field === 'phone' ? 'That mobile number is already in use.' : 'That email is already in use.';
        return NextResponse.json({ error: message, fields: { [field]: [message] } }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error('[mediaworld/profile PATCH] error:', error);
    return NextResponse.json({ error: 'Unable to update your details.' }, { status: 500 });
  }
}
