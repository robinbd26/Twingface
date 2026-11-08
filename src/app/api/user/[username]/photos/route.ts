import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseProfilePhotoLimit, profilePhotoQuery } from '@/lib/profile-photos';

type Context = { params: Promise<{ username: string }> };

export async function GET(request: Request, { params }: Context) {
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const limit = parseProfilePhotoLimit(searchParams.get('limit'));
  const cursor = searchParams.get('cursor') || undefined;
  const rows = await prisma.post.findMany(profilePhotoQuery(user.id, limit + 1, cursor));
  const hasMore = rows.length > limit;
  const photos = hasMore ? rows.slice(0, limit) : rows;

  return NextResponse.json({ photos, nextCursor: hasMore ? photos.at(-1)?.id ?? null : null });
}
