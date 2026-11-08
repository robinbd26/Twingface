import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeGroupMemberSelect } from '@/lib/group';

type Context = { params: Promise<{ handle: string }> };

export async function POST(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { handle } = await params;
  const group = await prisma.group.findUnique({ where: { handle: handle.toLowerCase() }, select: { id: true, privacy: true } });
  if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
  const status = group.privacy === 'PUBLIC' ? 'APPROVED' : 'PENDING';
  const membership = await prisma.groupMembership.upsert({
    where: { groupId_userId: { groupId: group.id, userId: user.id } },
    create: { groupId: group.id, userId: user.id, role: 'MEMBER', status },
    update: {},
    select: safeGroupMemberSelect,
  });
  return NextResponse.json({ membership });
}
