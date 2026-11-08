import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { destroyPageMedia, uploadPageMedia } from '@/lib/cloudinary';
import { prisma } from '@/lib/db';
import { safePageSelect } from '@/lib/page';
import { isValidProfileMediaBytes, isValidProfileMediaFile, isProfileMediaFile } from '@/lib/profile-media';
import { UpdatePageSchema } from '@/lib/validations';

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id }, select: safePageSelect });
  return page ? NextResponse.json({ page }) : NextResponse.json({ error: 'Page not found.' }, { status: 404 });
}

async function getOwnedPage(id: string): Promise<{ ok: false; response: NextResponse } | { ok: true; page: { id: string; ownerId: string } }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: 'Authentication is required.' }, { status: 401 }) };
  const page = await prisma.page.findUnique({ where: { id }, select: { id: true, ownerId: true } });
  if (!page) return { ok: false, response: NextResponse.json({ error: 'Page not found.' }, { status: 404 }) };
  if (page.ownerId !== user.id) return { ok: false, response: NextResponse.json({ error: 'You are not allowed to modify this page.' }, { status: 403 }) };
  return { ok: true, page };
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const owned = await getOwnedPage(id);
  if (!owned.ok) return owned.response;
  const { page } = owned;

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.startsWith('multipart/form-data')) {
    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { avatar: ['Choose a valid image file.'] } }, { status: 400 });
    const kind: 'avatar' | 'cover' = form.get('avatar') !== null ? 'avatar' : 'cover';
    const image = form.get(kind);
    if (!isProfileMediaFile(image) || !isValidProfileMediaFile(image)) {
      return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { [kind]: ['Choose a valid image file.'] } }, { status: 400 });
    }
    const bytes = Buffer.from(await image.arrayBuffer());
    if (!isValidProfileMediaBytes(image.type, bytes)) {
      return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { [kind]: ['Choose a valid image file.'] } }, { status: 400 });
    }
    let uploaded: { imageUrl: string };
    try {
      uploaded = await uploadPageMedia({ bytes, mimeType: image.type, pageId: page.id, kind });
    } catch {
      return NextResponse.json({ error: 'Unable to upload image. Please try again.' }, { status: 502 });
    }
    const updated = await prisma.page.update({
      where: { id: page.id },
      data: kind === 'avatar'
        ? { avatarUrl: uploaded.imageUrl, avatarPublicId: `twingface/pages/${page.id}/avatar` }
        : { coverUrl: uploaded.imageUrl, coverPublicId: `twingface/pages/${page.id}/cover` },
      select: safePageSelect,
    });
    return NextResponse.json({ page: updated });
  }

  const input = UpdatePageSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });
  try {
    const updated = await prisma.page.update({
      where: { id: page.id },
      data: { name: input.data.name, handle: input.data.handle, category: input.data.category, bio: input.data.bio },
      select: safePageSelect,
    });
    return NextResponse.json({ page: updated });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { handle: ['This handle is already taken.'] } }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_: Request, { params }: Context) {
  const { id } = await params;
  const owned = await getOwnedPage(id);
  if (!owned.ok) return owned.response;
  await prisma.page.delete({ where: { id: owned.page.id } });
  try {
    await destroyPageMedia(owned.page.id);
  } catch {
    // The database page (and its posts) is already deleted; never expose provider cleanup details.
  }
  return new NextResponse(null, { status: 204 });
}