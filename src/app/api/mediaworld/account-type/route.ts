import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ChooseAccountTypeSchema } from '@/lib/mediaworld/validations';

export const runtime = 'nodejs';

// Chooses the Media World account type once, during post-registration
// onboarding. Existing accounts keep whatever type they already have.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const parsed = ChooseAccountTypeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { accountType: true },
    });
    if (!current) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    if (current.accountType) {
      return NextResponse.json(
        { error: 'Account type is already set.', accountType: current.accountType },
        { status: 409 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { accountType: parsed.data.accountType },
      select: { accountType: true },
    });
    return NextResponse.json({ accountType: updated.accountType }, { status: 201 });
  } catch (error) {
    console.error('[mediaworld/account-type POST] error:', error);
    return NextResponse.json({ error: 'Unable to set account type.' }, { status: 500 });
  }
}
