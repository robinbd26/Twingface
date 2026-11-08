import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { destroyPostImage, uploadPagePostImage } from '@/lib/cloudinary';
import { prisma } from '@/lib/db';
import { PAGE_TIMELINE_SIZE, safePagePostSelect } from '@/lib/page';
import { isValidPostImage, isValidPostImageBytes } from '@/lib/post-media';
import { CreatePagePostSchema } from '@/lib/validations';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

function parseTimelineLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return PAGE_TIMELINE_SIZE;
  return Math.min(parsed, PAGE_TIMELINE_SIZE);
}

export async function GET(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id }, select: { id: true } });
  if (!page) return NextResponse.json({ error: 'Page not found.' }, { status: 404 });
  const { searchParams } = new URL(request.url);
  const limit = parseTimelineLimit(searchParams.get('limit'));
  const cursor = searchParams.get('cursor') || undefined;
  const posts = await prisma.pagePost.findMany({
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    where: { pageId: page.id },
    orderBy: { createdAt: 'desc' },
    select: safePagePostSelect,
  });
  const hasMore = posts.length > limit;
  const timeline = hasMore ? posts.slice(0, limit) : posts;
  return NextResponse.json({ posts: timeline, nextCursor: hasMore ? timeline.at(-1)?.id ?? null : null });
}

export async function POST(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id }, select: { id: true, ownerId: true } });
  if (!page) return NextResponse.json({ error: 'Page not found.' }, { status: 404 });
  if (page.ownerId !== user.id) return NextResponse.json({ error: 'You are not allowed to post to this page.' }, { status: 403 });

  const contentType = request.headers.get('content-type') ?? '';
  let content: string | null = null;
  let image: File | null = null;
  if (contentType.startsWith('multipart/form-data')) {
    const form = await request.formData().catch(() => null);
    content = typeof form?.get('content') === 'string' ? (form?.get('content') as string) : null;
    const entry = form?.get('image') ?? null;
    if (entry !== null) {
      if (!isValidPostImage(entry as File)) {
        return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { image: ['Choose a JPEG, PNG, WebP, or GIF image up to 5 MB.'] } }, { status: 400 });
      }
      image = entry as File;
    }
  } else {
    const body = await request.json().catch(() => null) as { content?: unknown } | null;
    content = typeof body?.content === 'string' ? body.content : null;
  }

  const input = CreatePagePostSchema.safeParse({ content });
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });

  let uploaded: { imageUrl: string; imagePublicId: string } | null = null;
  if (image) {
    const bytes = Buffer.from(await image.arrayBuffer());
    if (!isValidPostImageBytes(image.type, bytes)) {
      return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { image: ['Choose a valid image file.'] } }, { status: 400 });
    }
    try {
      uploaded = await uploadPagePostImage({ bytes, mimeType: image.type, pageId: page.id });
    } catch {
      return NextResponse.json({ error: 'Unable to upload image. Please try again.' }, { status: 502 });
    }
  }

  try {
    const post = await prisma.pagePost.create({
      data: {
        content: input.data.content,
        pageId: page.id,
        authorId: user.id,
        imageUrl: uploaded?.imageUrl ?? null,
        imagePublicId: uploaded?.imagePublicId ?? null,
      },
      select: safePagePostSelect,
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    if (uploaded) {
      try {
        await destroyPostImage(uploaded.imagePublicId);
      } catch {
        // The post was not created; cleanup failure must not expose provider details.
      }
    }
    throw error;
  }
}