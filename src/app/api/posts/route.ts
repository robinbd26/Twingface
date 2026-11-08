import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { destroyPostImage, uploadPostImage } from '@/lib/cloudinary';
import { prisma } from '@/lib/db';
import { parsePostLimit, safePostSelect } from '@/lib/post';
import { isValidPostImageBytes, parseCreatePostInput } from '@/lib/post-media';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parsePostLimit(searchParams.get('limit'));
  const cursor = searchParams.get('cursor') || undefined;
  const posts = await prisma.post.findMany({
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    select: safePostSelect,
  });
  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;
  return NextResponse.json({ posts: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const contentType = request.headers.get('content-type') ?? '';
  let input;
  if (contentType.startsWith('multipart/form-data')) {
    const form = await request.formData().catch(() => null);
    input = parseCreatePostInput(form?.get('content') ?? null, form?.get('image') ?? null, form?.get('feelingActivity') ?? null, form?.get('youtubeUrl') ?? null);
  } else if (contentType.startsWith('application/json')) {
    const body = await request.json().catch(() => null) as { content?: unknown; feelingActivity?: unknown; youtubeUrl?: unknown } | null;
    input = parseCreatePostInput(typeof body?.content === 'string' ? body.content : null, null, body?.feelingActivity ?? null, body?.youtubeUrl ?? null);
  } else {
    input = parseCreatePostInput(null, null);
  }
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });

  let uploaded: { imageUrl: string; imagePublicId: string } | null = null;
  if (input.data.image) {
    try {
      const bytes = Buffer.from(await input.data.image.arrayBuffer());
      if (!isValidPostImageBytes(input.data.image.type, bytes)) {
        return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { image: ['Choose a valid image file.'] } }, { status: 400 });
      }
      uploaded = await uploadPostImage({
        bytes,
        mimeType: input.data.image.type,
        userId: user.id,
      });
    } catch {
      return NextResponse.json({ error: 'Unable to upload image. Please try again.' }, { status: 502 });
    }
  }

  try {
    const post = await prisma.post.create({
      data: {
        content: input.data.content,
        authorId: user.id,
        imageUrl: uploaded?.imageUrl ?? null,
        imagePublicId: uploaded?.imagePublicId ?? null,
        feelingActivity: input.data.feelingActivity,
        youtubeUrl: input.data.youtubeUrl,
      },
      select: safePostSelect,
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch {
    if (uploaded) {
      try {
        await destroyPostImage(uploaded.imagePublicId);
      } catch {
        // The post was not created; cleanup failure must not expose provider details.
      }
    }
    return NextResponse.json({ error: 'Unable to publish your post. Please try again.' }, { status: 500 });
  }
}
