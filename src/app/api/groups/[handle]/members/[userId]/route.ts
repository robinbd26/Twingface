import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { GroupMemberActionSchema, } from '@/lib/validations';

type Context = { params: Promise<{ handle: string; userId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { handle, userId } = await params;
  if (userId === actor.id) return NextResponse.json({ error: 'You cannot manage your own administrator membership here.' }, { status: 400 });
  const input = GroupMemberActionSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });
  const group = await prisma.group.findUnique({ where: { handle: handle.toLowerCase() }, select: { id: true } });
  if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
  const actorMembership = await prisma.groupMembership.findUnique({ where: { groupId_userId: { groupId: group.id, userId: actor.id } }, select: { status: true, role: true } });
  if (actorMembership?.status !== 'APPROVED' || actorMembership.role !== 'ADMIN') return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 });
  const target = await prisma.groupMembership.findUnique({ where: { groupId_userId: { groupId: group.id, userId } }, select: { id: true, status: true, role: true } });
  if (!target) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });

  if (input.data.action === 'approve' || input.data.action === 'reject') {
    if (target.status !== 'PENDING') return NextResponse.json({ error: 'This request is no longer pending.' }, { status: 409 });
    const membership = await prisma.groupMembership.update({ where: { id: target.id }, data: { status: input.data.action === 'approve' ? 'APPROVED' : 'REJECTED' } });
    return NextResponse.json({ membership });
  }
  await prisma.groupMembership.delete({ where: { id: target.id } });
  return new NextResponse(null, { status: 204 });
}
