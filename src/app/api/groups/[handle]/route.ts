import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeGroupSelect } from '@/lib/group';
import { UpdateGroupSchema } from '@/lib/validations';

type Context = { params: Promise<{ handle: string }> };

async function findGroup(handle: string) {
  return prisma.group.findUnique({ where: { handle: handle.toLowerCase() }, select: safeGroupSelect });
}

export async function GET(_request: Request, { params }: Context) {
  const { handle } = await params;
  const group = await findGroup(handle);
  if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
  const user = await getCurrentUser();
  const viewerMembership = user
    ? await prisma.groupMembership.findUnique({ where: { groupId_userId: { groupId: group.id, userId: user.id } }, select: { status: true, role: true } })
    : null;
  return NextResponse.json({ group, viewerMembership });
}

export async function PATCH(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { handle } = await params;
  const group = await findGroup(handle);
  if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
  const membership = await prisma.groupMembership.findUnique({ where: { groupId_userId: { groupId: group.id, userId: user.id } }, select: { status: true, role: true } });
  if (membership?.status !== 'APPROVED' || membership.role !== 'ADMIN') return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 });
  const input = UpdateGroupSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });
  const updated = await prisma.group.update({ where: { id: group.id }, data: input.data, select: safeGroupSelect });
  return NextResponse.json({ group: updated });
}
