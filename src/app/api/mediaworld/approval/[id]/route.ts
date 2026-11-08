import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const action = body?.action === 'approve' ? 'APPROVED' : body?.action === 'reject' ? 'REJECTED' : null;
    if (!action) {
      return NextResponse.json({ error: "Invalid action. Use 'approve' or 'reject'." }, { status: 400 });
    }

    const profile = await prisma.mediaProfile.update({
      where: { id },
      data: { status: action },
      select: { id: true, fullName: true, status: true, userId: true },
    });
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[mediaworld/approval PATCH] error:', error);
    return NextResponse.json({ error: 'Unable to update profile status.' }, { status: 500 });
  }
}
