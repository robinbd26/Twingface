import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RentalInquiryStatusSchema } from '@/lib/mediaworld/rental';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

// Only the provider who owns the listed equipment can move an inquiry along;
// the sender keeps read access through their own inquiry list.
export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const { id } = await params;
    if (!/^[a-z0-9]{1,40}$/i.test(id)) return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });

    const body = await request.json().catch(() => null);
    const status = RentalInquiryStatusSchema.safeParse((body as { status?: unknown } | null)?.status);
    if (!status.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: { status: ['Choose a valid status.'] } },
        { status: 400 },
      );
    }

    const provider = await prisma.rentalProvider.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!provider) return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });

    const inquiry = await prisma.inquiry.findFirst({
      where: { id, listing: { providerId: provider.id } },
      select: { id: true, status: true },
    });
    if (!inquiry) return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });

    const updated = await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: { status: status.data },
      select: { id: true, status: true, updatedAt: true },
    });
    return NextResponse.json({ inquiry: updated });
  } catch (error) {
    console.error('[for-rent/inquiries/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Unable to update inquiry.' }, { status: 500 });
  }
}
