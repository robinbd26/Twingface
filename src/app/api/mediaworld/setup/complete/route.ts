import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

// Final gate of the setup wizard: the account and its identities are saved as
// the user goes, so this verifies the profile is actually complete.
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { username: true, accountType: true, _count: { select: { professionalIdentities: true } } },
    });
    if (!account) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    if (account.accountType !== 'PROFESSIONAL') {
      return NextResponse.json({ error: 'This setup flow is only for Media Professional accounts.' }, { status: 403 });
    }
    if (account._count.professionalIdentities === 0) {
      return NextResponse.json({ error: 'Add at least one profession before finishing.' }, { status: 400 });
    }

    return NextResponse.json({ username: account.username, identities: account._count.professionalIdentities });
  } catch (error) {
    console.error('[mediaworld/setup/complete POST] error:', error);
    return NextResponse.json({ error: 'Unable to finish setup.' }, { status: 500 });
  }
}
