import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RentalInquiryStatusSchema } from '@/lib/mediaworld/rental';

export const runtime = 'nodejs';

const inquirySelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  message: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  listing: { select: { id: true, title: true, pricePaisa: true, priceUnit: true, isActive: true } },
  user: { select: { id: true, name: true, username: true, profileImage: true } },
} as const;

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const searchParams = new URL(request.url).searchParams;
    const box = searchParams.get('box') === 'sent' ? 'sent' : 'received';
    const rawStatus = searchParams.get('status');
    const status = rawStatus ? RentalInquiryStatusSchema.safeParse(rawStatus) : null;
    if (status && !status.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: { status: ['Unknown inquiry status.'] } },
        { status: 400 },
      );
    }

    const provider = box === 'received'
      ? await prisma.rentalProvider.findUnique({ where: { userId: user.id }, select: { id: true } })
      : null;
    if (box === 'received' && !provider) return NextResponse.json({ box, inquiries: [] });

    const inquiries = await prisma.inquiry.findMany({
      where: {
        ...(box === 'received' ? { listing: { provider: { id: provider!.id } } } : { userId: user.id }),
        ...(status?.success ? { status: status.data } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
      select: inquirySelect,
    });
    return NextResponse.json({ box, inquiries });
  } catch (error) {
    console.error('[for-rent/inquiries GET] error:', error);
    return NextResponse.json({ error: 'Unable to load inquiries.' }, { status: 500 });
  }
}
