import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { parseCommentLimit, safeCommentSelect } from '@/lib/comment';
import { prisma } from '@/lib/db';
import { CreateCommentSchema } from '@/lib/validations';

type Context = { params: Promise<{ id: string }> };

async function postExists(id: string) {
  return prisma.post.findUnique({ where: { id }, select: { id: true } });
}

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  if (!await postExists(id)) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const limit = parseCommentLimit(searchParams.get('limit'));
  const cursor = searchParams.get('cursor') || undefined;
  const rows = await prisma.comment.findMany({
    where: { postId: id },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: safeCommentSelect,
  });
  const hasMore = rows.length > limit;
  const comments = hasMore ? rows.slice(0, limit) : rows;
  return NextResponse.json({ comments, nextCursor: hasMore ? comments.at(-1)?.id ?? null : null });
}

export async function POST(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const { id } = await params;
  if (!await postExists(id)) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });

  const input = CreateCommentSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });

  const comment = await prisma.comment.create({
    data: { content: input.data.content, postId: id, authorId: user.id },
    select: safeCommentSelect,
  });
  return NextResponse.json({ comment }, { status: 201 });
}
