import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseNotificationLimit, safeNotificationSelect } from '@/lib/notification';

const MarkReadSchema = z
  .object({ id: z.string().trim().min(1).max(40).optional(), all: z.boolean().optional() })
  .strict()
  .refine((data) => Boolean(data.id) || data.all === true, {
    message: 'Provide a notification id or set all to true.',
  });

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const limit = parseNotificationLimit(new URL(request.url).searchParams.get('limit'));
  const notifications = await prisma.notification.findMany({
    where: { recipientId: user.id, type: { not: 'MESSAGE' } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: safeNotificationSelect,
  });
  const unreadCount = await prisma.notification.count({ where: { recipientId: user.id, type: { not: 'MESSAGE' }, isRead: false } });
  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const input = MarkReadSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });

  // Scope every write to the session user so one account can never mark
  // another account's notifications as read.
  if (input.data.all) {
    await prisma.notification.updateMany({ where: { recipientId: user.id, type: { not: 'MESSAGE' }, isRead: false }, data: { isRead: true } });
  } else if (input.data.id) {
    await prisma.notification.updateMany({ where: { id: input.data.id, recipientId: user.id }, data: { isRead: true } });
  }

  const unreadCount = await prisma.notification.count({ where: { recipientId: user.id, type: { not: 'MESSAGE' }, isRead: false } });
  return NextResponse.json({ unreadCount });
}
