import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { destroyShowcasePhoto } from '@/lib/cloudinary';
import { prisma } from '@/lib/db';
import { ShowcaseUpdateSchema } from '@/lib/mediaworld/showcase';
import { showcaseItemSelect } from '@/lib/mediaworld/showcase-data';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const { id } = await params;
  const item = await prisma.talentShowcaseItem.findFirst({
    where: { id, userId: user.id },
    select: { id: true, kind: true },
  });
  if (!item) return NextResponse.json({ error: 'Portfolio item not found.' }, { status: 404 });

  const parsed = ShowcaseUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  if (item.kind === 'PHOTO' && typeof parsed.data.url === 'string') {
    return NextResponse.json({ error: 'Photo links are managed by the upload; delete and re-upload to replace one.' }, { status: 400 });
  }
  if (item.kind === 'VIDEO' && parsed.data.url !== undefined && !parsed.data.url) {
    return NextResponse.json({ error: 'Paste a video link.' }, { status: 400 });
  }

  const data: { title?: string | null; url?: string } = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title || null;
  if (item.kind === 'VIDEO' && parsed.data.url) data.url = parsed.data.url;

  try {
    const updated = await prisma.talentShowcaseItem.update({
      where: { id: item.id },
      data,
      select: showcaseItemSelect,
    });
    return NextResponse.json({ item: updated });
  } catch {
    return NextResponse.json({ error: 'Unable to update that portfolio item.' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const { id } = await params;
  const item = await prisma.talentShowcaseItem.findFirst({
    where: { id, userId: user.id },
    select: { id: true, kind: true, publicId: true },
  });
  if (!item) return NextResponse.json({ error: 'Portfolio item not found.' }, { status: 404 });

  try {
    await prisma.talentShowcaseItem.delete({ where: { id: item.id } });
  } catch {
    return NextResponse.json({ error: 'Unable to delete that portfolio item.' }, { status: 500 });
  }

  if (item.kind === 'PHOTO' && item.publicId) {
    await destroyShowcasePhoto(item.publicId).catch(() => undefined);
  }
  return NextResponse.json({ deleted: true });
}
