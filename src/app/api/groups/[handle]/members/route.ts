import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseGroupLimit, safeGroupMemberSelect } from '@/lib/group';

type Context = { params: Promise<{ handle: string }> };

export async function GET(request: Request, { params }: Context) {
  const { handle } = await params;
  const group = await prisma.group.findUnique({ where: { handle: handle.toLowerCase() }, select: { id: true, privacy: true } });
  if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
  const user = await getCurrentUser();
  if (group.privacy === 'PRIVATE') {
    if (!user) return NextResponse.json({ error: 'Approved membership is required.' }, { status: 403 });
    const membership = await prisma.groupMembership.findUnique({ where: { groupId_userId: { groupId: group.id, userId: user.id } }, select: { status: true } });
    if (membership?.status !== 'APPROVED') return NextResponse.json({ error: 'Approved membership is required.' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const limit = parseGroupLimit(searchParams.get('limit'));
  const cursor = searchParams.get('cursor') || undefined;
  const rows = await prisma.groupMembership.findMany({
    where: { groupId: group.id, status: 'APPROVED' },
    select: safeGroupMemberSelect,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasNextPage = rows.length > limit;
  const members = hasNextPage ? rows.slice(0, limit) : rows;
  return NextResponse.json({ members, nextCursor: hasNextPage ? members.at(-1)?.id ?? null : null });
}
