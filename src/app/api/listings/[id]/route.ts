import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeListingSelect } from '@/lib/listing';
import { UpdateListingSchema } from '@/lib/validations';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.listing.findUnique({ where: { id }, select: { sellerId: true } });
  if (!existing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  if (existing.sellerId !== user.id) return NextResponse.json({ error: 'Only the seller can edit this listing.' }, { status: 403 });

  const input = UpdateListingSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });

  const listing = await prisma.listing.update({ where: { id }, data: input.data, select: safeListingSelect });
  return NextResponse.json({ listing });
}

export async function DELETE(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.listing.findUnique({ where: { id }, select: { sellerId: true } });
  if (!existing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  if (existing.sellerId !== user.id) return NextResponse.json({ error: 'Only the seller can delete this listing.' }, { status: 403 });

  await prisma.listing.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
