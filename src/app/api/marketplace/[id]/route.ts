import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { destroyPostImage, uploadMarketplaceImage } from '@/lib/cloudinary';
import { prisma } from '@/lib/db';
import { parseMarketplaceUpdateInput, safeMarketplaceListingSelect } from '@/lib/marketplace';
import { isValidPostImageBytes } from '@/lib/post-media';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

const ownedListingSelect = {
  sellerId: true,
  images: { select: { id: true, url: true, publicId: true, position: true } },
};

export async function GET(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { id } = await params;
  const listing = await prisma.marketplaceListing.findUnique({ where: { id }, select: safeMarketplaceListingSelect });
  if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  return NextResponse.json({ listing });
}

export async function PATCH(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { id } = await params;
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Please correct the highlighted fields.' }, { status: 400 });
  }
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Please correct the highlighted fields.' }, { status: 400 });
  const input = parseMarketplaceUpdateInput(formData);
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });

  const existing = await prisma.marketplaceListing.findUnique({ where: { id }, select: ownedListingSelect });
  if (!existing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  if (existing.sellerId !== user.id) return NextResponse.json({ error: 'Only the seller can edit this listing.' }, { status: 403 });

  const files = await Promise.all(input.data.images.map(async (image) => ({ file: image, bytes: Buffer.from(await image.arrayBuffer()) })));
  if (files.some(({ file, bytes }) => !isValidPostImageBytes(file.type, bytes))) {
    return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { images: ['Choose valid image files.'] } }, { status: 400 });
  }
  const retainsSpecified = formData.has('retainedImageIds');
  const retainedIds = retainsSpecified ? new Set(input.data.retainedImageIds) : new Set(existing.images.map((image) => image.id));
  if ([...retainedIds].some((retainedId) => !existing.images.some((image) => image.id === retainedId))) {
    return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { retainedImageIds: ['Choose images from this listing.'] } }, { status: 400 });
  }
  const finalImageCount = retainedIds.size + files.length;
  if (finalImageCount < 1 || finalImageCount > 10) {
    return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { images: ['A listing must contain between 1 and 10 images.'] } }, { status: 400 });
  }

  const uploaded: Array<{ imageUrl: string; imagePublicId: string }> = [];
  try {
    for (const { file, bytes } of files) uploaded.push(await uploadMarketplaceImage({ bytes, mimeType: file.type, sellerId: user.id }));
  } catch {
    await Promise.all(uploaded.map(async ({ imagePublicId }) => { try { await destroyPostImage(imagePublicId); } catch { /* best effort */ } }));
    return NextResponse.json({ error: 'Unable to upload images. Please try again.' }, { status: 502 });
  }

  const retainedImages = existing.images.filter((image) => retainedIds.has(image.id)).sort((left, right) => left.position - right.position);
  const removedImages = existing.images.filter((image) => !retainedIds.has(image.id));
  const imagesChanged = retainsSpecified || uploaded.length > 0;
  try {
    const listing = await prisma.$transaction((transaction) => transaction.marketplaceListing.update({
      where: { id },
      data: {
        ...(input.data.title !== undefined ? { title: input.data.title } : {}),
        ...(input.data.description !== undefined ? { description: input.data.description } : {}),
        ...(input.data.pricePaisa !== undefined ? { pricePaisa: input.data.pricePaisa } : {}),
        ...(input.data.category !== undefined ? { category: input.data.category } : {}),
        ...(input.data.condition !== undefined ? { condition: input.data.condition } : {}),
        ...(input.data.location !== undefined ? { location: input.data.location } : {}),
        ...(input.data.status !== undefined ? { status: input.data.status } : {}),
        ...(imagesChanged ? {
          images: {
            deleteMany: {},
            create: [
              ...retainedImages.map((image, position) => ({ url: image.url, publicId: image.publicId, position })),
              ...uploaded.map(({ imageUrl, imagePublicId }, index) => ({ url: imageUrl, publicId: imagePublicId, position: retainedImages.length + index })),
            ],
          },
        } : {}),
      },
      select: safeMarketplaceListingSelect,
    }));
    await Promise.all(removedImages.map(async ({ publicId }) => { try { await destroyPostImage(publicId); } catch { /* best effort */ } }));
    return NextResponse.json({ listing });
  } catch {
    await Promise.all(uploaded.map(async ({ imagePublicId }) => { try { await destroyPostImage(imagePublicId); } catch { /* best effort */ } }));
    return NextResponse.json({ error: 'Unable to update listing. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.marketplaceListing.findUnique({ where: { id }, select: ownedListingSelect });
  if (!existing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  if (existing.sellerId !== user.id) return NextResponse.json({ error: 'Only the seller can delete this listing.' }, { status: 403 });
  await prisma.marketplaceListing.delete({ where: { id } });
  await Promise.all(existing.images.map(async ({ publicId }) => { try { await destroyPostImage(publicId); } catch { /* best effort */ } }));
  return new NextResponse(null, { status: 204 });
}
