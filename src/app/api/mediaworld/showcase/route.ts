import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { destroyShowcasePhoto, uploadShowcasePhoto } from '@/lib/cloudinary';
import { prisma } from '@/lib/db';
import {
  isProfileMediaFile,
  isValidProfileMediaBytes,
  isValidProfileMediaFile,
} from '@/lib/profile-media';
import {
  MAX_SHOWCASE_PHOTOS,
  MAX_SHOWCASE_TITLE,
  MAX_SHOWCASE_VIDEOS,
  ShowcaseVideoSchema,
} from '@/lib/mediaworld/showcase';
import { showcaseItemSelect, type ShowcaseItemView } from '@/lib/mediaworld/showcase-data';

export const runtime = 'nodejs';

type ShowcaseItem = ShowcaseItemView;

class ShowcaseLimitError extends Error {}

const LIMITS = { PHOTO: MAX_SHOWCASE_PHOTOS, VIDEO: MAX_SHOWCASE_VIDEOS } as const;

async function appendItem(data: { userId: string; kind: 'PHOTO' | 'VIDEO'; url: string; publicId?: string | null; title: string | null }): Promise<ShowcaseItem> {
  return prisma.$transaction(async (tx) => {
    const count = await tx.talentShowcaseItem.count({ where: { userId: data.userId, kind: data.kind } });
    if (count >= LIMITS[data.kind]) throw new ShowcaseLimitError();
    const last = await tx.talentShowcaseItem.findFirst({
      where: { userId: data.userId, kind: data.kind },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return tx.talentShowcaseItem.create({
      data: { ...data, position: (last?.position ?? -1) + 1 },
      select: showcaseItemSelect,
    });
  });
}

function limitMessage(kind: 'PHOTO' | 'VIDEO') {
  return kind === 'PHOTO'
    ? `A profile can show at most ${MAX_SHOWCASE_PHOTOS} portfolio photos.`
    : `A profile can show at most ${MAX_SHOWCASE_VIDEOS} portfolio videos.`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const items = await prisma.talentShowcaseItem.findMany({
    where: { userId: user.id },
    orderBy: [{ kind: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
    select: showcaseItemSelect,
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { accountType: true } });
  if (!account) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  if (!account.accountType) {
    return NextResponse.json({ error: 'Portfolio items are available for Media World profiles.' }, { status: 403 });
  }

  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null);
    const image = form?.get('image') ?? null;
    if (!isProfileMediaFile(image) || !isValidProfileMediaFile(image)) {
      return NextResponse.json({ error: 'Choose a JPEG, PNG, WebP, or GIF image up to 5 MB.' }, { status: 400 });
    }
    const bytes = Buffer.from(await image.arrayBuffer());
    if (!isValidProfileMediaBytes(image.type, bytes)) {
      return NextResponse.json({ error: 'Choose a valid image file.' }, { status: 400 });
    }
    const rawTitle = typeof form?.get('title') === 'string' ? String(form.get('title')).trim() : '';
    if (rawTitle.length > MAX_SHOWCASE_TITLE) {
      return NextResponse.json({ error: `Keep the caption under ${MAX_SHOWCASE_TITLE} characters.` }, { status: 400 });
    }

    const count = await prisma.talentShowcaseItem.count({ where: { userId: user.id, kind: 'PHOTO' } });
    if (count >= MAX_SHOWCASE_PHOTOS) {
      return NextResponse.json({ error: limitMessage('PHOTO') }, { status: 400 });
    }

    let uploaded: { imageUrl: string; imagePublicId: string };
    try {
      uploaded = await uploadShowcasePhoto({ bytes, mimeType: image.type, userId: user.id });
    } catch {
      return NextResponse.json({ error: 'Unable to upload that photo. Please try again.' }, { status: 502 });
    }

    try {
      const item = await appendItem({
        userId: user.id,
        kind: 'PHOTO',
        url: uploaded.imageUrl,
        publicId: uploaded.imagePublicId,
        title: rawTitle || null,
      });
      return NextResponse.json({ item }, { status: 201 });
    } catch (error) {
      await destroyShowcasePhoto(uploaded.imagePublicId).catch(() => undefined);
      if (error instanceof ShowcaseLimitError) {
        return NextResponse.json({ error: limitMessage('PHOTO') }, { status: 400 });
      }
      return NextResponse.json({ error: 'Unable to save that photo. Please try again.' }, { status: 500 });
    }
  }

  const parsed = ShowcaseVideoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const item = await appendItem({
      userId: user.id,
      kind: 'VIDEO',
      url: parsed.data.url,
      title: parsed.data.title || null,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof ShowcaseLimitError) {
      return NextResponse.json({ error: limitMessage('VIDEO') }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to add that video. Please try again.' }, { status: 500 });
  }
}
