import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { destroyPostImage, uploadPostImage } from '@/lib/cloudinary';
import { prisma } from '@/lib/db';
import { canPostInGroup, canViewGroup, parseGroupLimit, safeGroupPostSelect } from '@/lib/group';
import { isValidPostImageBytes, parseCreatePostInput } from '@/lib/post-media';

export const runtime = 'nodejs';
type Context = { params: Promise<{ handle: string }> };

async function loadGroup(handle: string) {
  return prisma.group.findUnique({ where: { handle: handle.toLowerCase() }, select: { id: true, privacy: true, postingPolicy: true } });
}

export async function GET(request: Request, { params }: Context) {
  const { handle } = await params;
  const group = await loadGroup(handle);
  if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
  const user = await getCurrentUser();
  const membership = user ? await prisma.groupMembership.findUnique({ where: { groupId_userId: { groupId: group.id, userId: user.id } }, select: { status: true, role: true } }) : null;
  if (!canViewGroup(group, membership)) return NextResponse.json({ error: 'Approved membership is required.' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const limit = parseGroupLimit(searchParams.get('limit'));
  const cursor = searchParams.get('cursor') || undefined;
  const rows = await prisma.groupPost.findMany({ where: { groupId: group.id }, select: safeGroupPostSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
  const hasNextPage = rows.length > limit;
  const posts = hasNextPage ? rows.slice(0, limit) : rows;
  return NextResponse.json({ posts, nextCursor: hasNextPage ? posts.at(-1)?.id ?? null : null });
}

export async function POST(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { handle } = await params;
  const group = await loadGroup(handle);
  if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
  const membership = await prisma.groupMembership.findUnique({ where: { groupId_userId: { groupId: group.id, userId: user.id } }, select: { status: true, role: true } });
  if (!canPostInGroup(group, membership)) return NextResponse.json({ error: 'You do not have permission to post in this group.' }, { status: 403 });
  const contentType = request.headers.get('content-type') ?? '';
  const form = contentType.startsWith('multipart/form-data') ? await request.formData().catch(() => null) : null;
  const body = contentType.startsWith('application/json') ? await request.json().catch(() => null) as { content?: unknown; feelingActivity?: unknown; youtubeUrl?: unknown } | null : null;
  const input = parseCreatePostInput(form?.get('content') ?? (typeof body?.content === 'string' ? body.content : null), form?.get('image') ?? null, form?.get('feelingActivity') ?? body?.feelingActivity ?? null, form?.get('youtubeUrl') ?? body?.youtubeUrl ?? null);
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });
  let uploaded: { imageUrl: string; imagePublicId: string } | null = null;
  if (input.data.image) {
    try {
      const bytes = Buffer.from(await input.data.image.arrayBuffer());
      if (!isValidPostImageBytes(input.data.image.type, bytes)) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { image: ['Choose a valid image file.'] } }, { status: 400 });
      uploaded = await uploadPostImage({ bytes, mimeType: input.data.image.type, userId: user.id });
    } catch { return NextResponse.json({ error: 'Unable to upload image. Please try again.' }, { status: 502 }); }
  }
  try {
    const post = await prisma.groupPost.create({ data: { groupId: group.id, authorId: user.id, content: input.data.content, imageUrl: uploaded?.imageUrl ?? null, imagePublicId: uploaded?.imagePublicId ?? null, feelingActivity: input.data.feelingActivity, youtubeUrl: input.data.youtubeUrl }, select: safeGroupPostSelect });
    return NextResponse.json({ post }, { status: 201 });
  } catch {
    if (uploaded) { try { await destroyPostImage(uploaded.imagePublicId); } catch { /* best effort only */ } }
    return NextResponse.json({ error: 'Unable to publish your post. Please try again.' }, { status: 500 });
  }
}
