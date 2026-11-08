import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { browseRentalListings, parseRentalBrowseParams } from '@/lib/mediaworld/rental-browse';
import {
  formImageFiles,
  formDataToFieldRecord,
  parseRentalListingFields,
  rentalListingCardSelect,
} from '@/lib/mediaworld/rental';
import { destroyRentalPhotos, uploadRentalPhotos, validateRentalPhotoCount } from '@/lib/mediaworld/rental-uploads';

export const runtime = 'nodejs';

// Browsing is auth-gated, matching /api/marketplace: provider contact details
// must not reach anonymous visitors.
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const parsed = parseRentalBrowseParams(new URL(request.url).searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { listings, nextCursor } = await browseRentalListings(parsed.data);
    return NextResponse.json({ listings, nextCursor });
  } catch (error) {
    console.error('[for-rent GET] error:', error);
    return NextResponse.json({ error: 'Unable to load rental listings.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const provider = await prisma.rentalProvider.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!provider) {
      return NextResponse.json({ error: 'Complete your rental provider profile before listing equipment.' }, { status: 403 });
    }

    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      return NextResponse.json({ error: 'Upload photos with the listing.' }, { status: 400 });
    }
    const formData = await request.formData().catch(() => null);
    if (!formData) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });

    const parsed = parseRentalListingFields(formDataToFieldRecord(formData));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { categoryId, subcategoryId } = parsed.data;
    const category = await prisma.rentalCategory.findFirst({
      where: { id: categoryId, isActive: true },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: { categoryId: ['Choose a valid rental category.'] } },
        { status: 400 },
      );
    }

    let resolvedSubcategoryId: string | null = null;
    if (subcategoryId) {
      const subcategory = await prisma.rentalSubcategory.findFirst({
        where: { id: subcategoryId, categoryId: category.id, isActive: true },
        select: { id: true },
      });
      if (!subcategory) {
        return NextResponse.json(
          { error: 'Please correct the highlighted fields.', fields: { subcategoryId: ['Choose a subcategory that belongs to that category.'] } },
          { status: 400 },
        );
      }
      resolvedSubcategoryId = subcategory.id;
    }

    const photos = formImageFiles(formData);
    const photoCountError = validateRentalPhotoCount(photos, { required: true });
    if (photoCountError) {
      return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { photos: [photoCountError] } }, { status: 400 });
    }

    const uploaded = await uploadRentalPhotos(photos, provider.id);
    if ('error' in uploaded) {
      return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: { photos: [uploaded.error] } }, { status: 400 });
    }

    try {
      const listing = await prisma.rentalListing.create({
        data: {
          ...parsed.data,
          providerId: provider.id,
          categoryId: category.id,
          subcategoryId: resolvedSubcategoryId,
          photos: {
            create: uploaded.photos.map((photo, position) => ({ url: photo.url, publicId: photo.publicId, position })),
          },
        },
        select: rentalListingCardSelect,
      });
      return NextResponse.json({ listing }, { status: 201 });
    } catch {
      await destroyRentalPhotos(uploaded.photos.map((photo) => photo.publicId));
      return NextResponse.json({ error: 'Unable to create listing. Please try again.' }, { status: 500 });
    }
  } catch (error) {
    console.error('[for-rent POST] error:', error);
    return NextResponse.json({ error: 'Unable to create listing.' }, { status: 500 });
  }
}
