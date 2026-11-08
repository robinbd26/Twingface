import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseGroupLimit, safeGroupSelect } from '@/lib/group';
import { CreateGroupSchema } from '@/lib/validations';

function decodeCursor(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    return typeof parsed === 'object' && parsed !== null && 'id' in parsed && typeof parsed.id === 'string' ? parsed.id : null;
  } catch {
    return null;
  }
}

function encodeCursor(id: string): string {
  return Buffer.from(JSON.stringify({ id })).toString('base64url');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') === 'mine' ? 'mine' : 'discover';
  const user = await getCurrentUser();
  if (scope === 'mine' && !user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const limit = parseGroupLimit(searchParams.get('limit'));
  const cursorId = decodeCursor(searchParams.get('cursor'));
  const query = searchParams.get('query')?.trim() ?? '';
  const where = scope === 'mine'
    ? { memberships: { some: { userId: user!.id, status: 'APPROVED' as const } } }
    : { privacy: 'PUBLIC' as const, ...(query ? { name: { contains: query, mode: 'insensitive' as const } } : {}) };
  const groups = await prisma.group.findMany({
    where,
    select: safeGroupSelect,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
  });
  const hasNextPage = groups.length > limit;
  const items = hasNextPage ? groups.slice(0, limit) : groups;
  return NextResponse.json({ groups: items, nextCursor: hasNextPage ? encodeCursor(items.at(-1)!.id) : null });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const input = CreateGroupSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });

  try {
    const group = await prisma.$transaction((tx) => tx.group.create({
      data: {
        ...input.data,
        creatorId: user.id,
        memberships: { create: { userId: user.id, role: 'ADMIN', status: 'APPROVED' } },
      },
      select: safeGroupSelect,
    }));
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { handle: ['This handle is already taken.'] } }, { status: 409 });
    }
    throw error;
  }
}
