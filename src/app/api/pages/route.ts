import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safePageSelect } from '@/lib/page';
import { CreatePageSchema } from '@/lib/validations';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const pages = await prisma.page.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: 'desc' }, select: safePageSelect });
  return NextResponse.json({ pages });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const input = CreatePageSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });
  try {
    const page = await prisma.page.create({ data: { name: input.data.name, handle: input.data.handle, category: input.data.category, bio: input.data.bio, ownerId: user.id }, select: safePageSelect });
    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { handle: ['This handle is already taken.'] } }, { status: 409 });
    }
    throw error;
  }
}