import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string; blockId: string }> };

const ID_PATTERN = /^[a-z0-9]{1,40}$/i;

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const { id, blockId } = await params;
    if (!ID_PATTERN.test(id) || !ID_PATTERN.test(blockId)) {
      return NextResponse.json({ error: 'Block not found.' }, { status: 404 });
    }

    const block = await prisma.rentalAvailabilityBlock.findUnique({
      where: { id: blockId },
      select: {
        id: true,
        listingId: true,
        listing: { select: { provider: { select: { userId: true } } } },
      },
    });
    if (!block || block.listingId !== id) {
      return NextResponse.json({ error: 'Block not found.' }, { status: 404 });
    }
    if (block.listing.provider.userId !== user.id) {
      return NextResponse.json(
        { error: 'Only the listing owner can remove its availability blocks.' },
        { status: 403 },
      );
    }

    await prisma.rentalAvailabilityBlock.delete({ where: { id: block.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[for-rent/blocks DELETE] error:', error);
    return NextResponse.json({ error: 'Unable to remove the availability block.' }, { status: 500 });
  }
}
