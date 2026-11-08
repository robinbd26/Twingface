import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { profilePhotoQuery } from '@/lib/profile-photos';

type Context = { params: Promise<{ username: string }> };

export async function GET(_: Request, { params }: Context) {
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const photos = await prisma.post.findMany(profilePhotoQuery(user.id, 9));
  return NextResponse.json({ photos });
}
