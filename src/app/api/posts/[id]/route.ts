import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { destroyPostImage } from '@/lib/cloudinary';
import { prisma } from '@/lib/db';
import { safePostSelect } from '@/lib/post';
import { UpdatePostSchema } from '@/lib/validations';

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Context) {
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id }, select: safePostSelect });
  return post ? NextResponse.json({ post }) : NextResponse.json({ error: 'Post not found.' }, { status: 404 });
}

async function getOwnedPost(id: string): Promise<{ ok: false; response: NextResponse } | { ok: true; post: { authorId: string; imagePublicId: string | null } }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: 'Authentication is required.' }, { status: 401 }) };
  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true, imagePublicId: true } });
  if (!post) return { ok: false, response: NextResponse.json({ error: 'Post not found.' }, { status: 404 }) };
  if (post.authorId !== user.id) return { ok: false, response: NextResponse.json({ error: 'You are not allowed to modify this post.' }, { status: 403 }) };
  return { ok: true, post };
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const owned = await getOwnedPost(id);
  if (!owned.ok) return owned.response;
  const input = UpdatePostSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });
  const post = await prisma.post.update({ where: { id }, data: { content: input.data.content }, select: safePostSelect });
  return NextResponse.json({ post });
}

export async function DELETE(_: Request, { params }: Context) {
  const { id } = await params;
  const owned = await getOwnedPost(id);
  if (!owned.ok) return owned.response;
  await prisma.post.delete({ where: { id } });
  if (owned.post.imagePublicId) {
    try {
      await destroyPostImage(owned.post.imagePublicId);
    } catch {
      // The database post is already deleted; never expose provider cleanup details.
    }
  }
  return new NextResponse(null, { status: 204 });
}
