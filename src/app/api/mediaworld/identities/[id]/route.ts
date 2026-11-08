import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const { id } = await params;
    const identity = await prisma.userProfessionalIdentity.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!identity) return NextResponse.json({ error: 'Professional identity not found.' }, { status: 404 });

    await prisma.userProfessionalIdentity.delete({ where: { id: identity.id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[mediaworld/identities/[id] DELETE] error:', error);
    return NextResponse.json({ error: 'Unable to remove professional identity.' }, { status: 500 });
  }
}
