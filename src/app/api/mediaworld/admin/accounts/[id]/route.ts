import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  accountTypeChangeBlockers,
  adminAccountSelect,
  AdminAccountUpdateSchema,
  adminFailure,
  isAdminId,
  type AccountSnapshot,
} from '@/lib/mediaworld/admin';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

const snapshotSelect = {
  id: true,
  accountType: true,
  _count: { select: { professionalIdentities: true } },
  organization: { select: { id: true } },
  rentalProvider: { select: { id: true, _count: { select: { listings: true } } } },
  mediaProfile: { select: { id: true, status: true } },
} as const;

async function loadSnapshot(id: string) {
  const account = await prisma.user.findUnique({ where: { id }, select: snapshotSelect });
  if (!account) return null;

  const providerId = account.rentalProvider?.id ?? null;
  const activeListings = providerId ? await prisma.rentalListing.count({ where: { providerId, isActive: true } }) : 0;

  const snapshot: AccountSnapshot = {
    currentType: account.accountType,
    identityCount: account._count.professionalIdentities,
    hasOrganization: account.organization !== null,
    providerId,
    activeListings,
    totalListings: account.rentalProvider?._count.listings ?? 0,
    mediaProfileStatus: account.mediaProfile?.status ?? null,
  };

  return { account, snapshot, mediaProfileId: account.mediaProfile?.id ?? null };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    if (!isAdminId(id)) return adminFailure(404, 'Account not found.');

    const loaded = await loadSnapshot(id);
    if (!loaded) return adminFailure(404, 'Account not found.');

    const account = await prisma.user.findUnique({ where: { id }, select: adminAccountSelect });
    return NextResponse.json({ account, snapshot: loaded.snapshot, mediaProfileId: loaded.mediaProfileId });
  } catch (error) {
    console.error('[mediaworld/admin/accounts/[id] GET] error:', error);
    return NextResponse.json({ error: 'Unable to load the account.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    if (!isAdminId(id)) return adminFailure(404, 'Account not found.');

    const body = await request.json().catch(() => null);
    const parsed = AdminAccountUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const loaded = await loadSnapshot(id);
    if (!loaded) return adminFailure(404, 'Account not found.');

    const blockers = accountTypeChangeBlockers(parsed.data.accountType, loaded.snapshot);
    if (blockers.length > 0) {
      return adminFailure(409, `${blockers.join(' ')} The account type was left unchanged.`);
    }

    await prisma.user.update({ where: { id }, data: { accountType: parsed.data.accountType } });
    const account = await prisma.user.findUnique({ where: { id }, select: adminAccountSelect });
    return NextResponse.json({ account, correction: true });
  } catch (error) {
    console.error('[mediaworld/admin/accounts/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Unable to correct the account type.' }, { status: 500 });
  }
}
