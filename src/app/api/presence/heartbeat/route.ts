import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

const HeartbeatSchema = z
  .object({ isOnline: z.boolean().optional() })
  .strict();

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const input = HeartbeatSchema.safeParse(await request.json().catch(() => ({})));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });

  const isOnline = input.data.isOnline ?? true;
  const now = new Date();
  const presence = await prisma.userPresence.upsert({
    where: { userId: user.id },
    create: { userId: user.id, isOnline, lastActiveAt: now },
    update: { isOnline, lastActiveAt: now },
    select: { userId: true, isOnline: true, lastActiveAt: true },
  });
  return NextResponse.json({ presence });
}
