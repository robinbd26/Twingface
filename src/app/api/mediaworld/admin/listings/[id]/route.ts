import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { adminFailure, AdminListingActionSchema, adminRentalListingSelect, isAdminId } from '@/lib/mediaworld/admin';
import { rentalListingDetailSelect } from '@/lib/mediaworld/rental';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    if (!isAdminId(id)) return adminFailure(404, 'Listing not found.');

    const listing = await prisma.rentalListing.findUnique({
      where: { id },
      select: { ...rentalListingDetailSelect, _count: { select: { inquiries: true, reports: true } } },
    });
    if (!listing) return adminFailure(404, 'Listing not found.');

    return NextResponse.json({ listing });
  } catch (error) {
    console.error('[mediaworld/admin/listings/[id] GET] error:', error);
    return NextResponse.json({ error: 'Unable to load rental listing.' }, { status: 500 });
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
    if (!isAdminId(id)) return adminFailure(404, 'Listing not found.');

    const body = await request.json().catch(() => null);
    const parsed = AdminListingActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const existing = await prisma.rentalListing.findUnique({ where: { id }, select: { id: true, isActive: true } });
    if (!existing) return adminFailure(404, 'Listing not found.');

    const isActive = parsed.data.action === 'restore';
    if (existing.isActive === isActive) {
      return NextResponse.json({ error: isActive ? 'Listing is already visible.' : 'Listing is already hidden.' }, { status: 400 });
    }

    const listing = await prisma.rentalListing.update({ where: { id }, data: { isActive }, select: adminRentalListingSelect });
    return NextResponse.json({ listing, action: parsed.data.action });
  } catch (error) {
    console.error('[mediaworld/admin/listings/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Unable to update the listing.' }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  if (user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });
  }

  return adminFailure(
    405,
    'Rental listings are never deleted from the admin panel. Hide the listing instead: the provider keeps their manage page history and existing inquiries keep their reference.',
  );
}
