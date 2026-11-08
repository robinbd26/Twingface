import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { destroyPostImage, uploadMarketplaceImage } from '@/lib/cloudinary';
import { prisma } from '@/lib/db';
import { parseMarketplaceBrowseInput, parseMarketplaceCreateInput, safeMarketplaceListingSelect } from '@/lib/marketplace';
import { isValidPostImageBytes } from '@/lib/post-media';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const input = parseMarketplaceBrowseInput(new URL(request.url).searchParams);
  const listings = await prisma.marketplaceListing.findMany({
    where: {
      status: 'AVAILABLE',
      ...(input.category ? { category: input.category } : {}),
      ...(input.query ? {
        OR: [
          { title: { contains: input.query, mode: 'insensitive' } },
          { location: { contains: input.query, mode: 'insensitive' } },
        ],
      } : {}),
    },
    take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: safeMarketplaceListingSelect,
  });
  const hasMore = listings.length > input.limit;
  const page = hasMore ? listings.slice(0, input.limit) : listings;
  return NextResponse.json({ listings: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Please correct the highlighted fields.' }, { status: 400 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Please correct the highlighted fields.' }, { status: 400 });
  const input = parseMarketplaceCreateInput(formData);
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });

  const files = await Promise.all(input.data.images.map(async (image) => ({
    file: image,
    bytes: Buffer.from(await image.arrayBuffer()),
  })));
  if (files.some(({ file, bytes }) => !isValidPostImageBytes(file.type, bytes))) {
    return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { images: ['Choose valid image files.'] } }, { status: 400 });
  }

  const uploaded: Array<{ imageUrl: string; imagePublicId: string }> = [];
  try {
    for (const { file, bytes } of files) {
      uploaded.push(await uploadMarketplaceImage({ bytes, mimeType: file.type, sellerId: user.id }));
    }
  } catch {
    await Promise.all(uploaded.map(async ({ imagePublicId }) => {
      try { await destroyPostImage(imagePublicId); } catch { /* cleanup is best effort */ }
    }));
    return NextResponse.json({ error: 'Unable to upload images. Please try again.' }, { status: 502 });
  }

  try {
    const listing = await prisma.$transaction((transaction) => transaction.marketplaceListing.create({
      data: {
        title: input.data.title,
        description: input.data.description,
        pricePaisa: input.data.pricePaisa,
        category: input.data.category,
        condition: input.data.condition,
        location: input.data.location,
        sellerId: user.id,
        images: {
          create: uploaded.map(({ imageUrl, imagePublicId }, position) => ({ url: imageUrl, publicId: imagePublicId, position })),
        },
      },
      select: safeMarketplaceListingSelect,
    }));
    return NextResponse.json({ listing }, { status: 201 });
  } catch {
    await Promise.all(uploaded.map(async ({ imagePublicId }) => {
      try { await destroyPostImage(imagePublicId); } catch { /* cleanup is best effort */ }
    }));
    return NextResponse.json({ error: 'Unable to create listing. Please try again.' }, { status: 500 });
  }
}
