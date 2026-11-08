import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  formImageFiles,
  formDataToFieldRecord,
  MAX_RENTAL_PHOTOS,
  parseRentalListingUpdateFields,
  rentalListingDetailSelect,
  rentalProviderPublicSelect,
} from '@/lib/mediaworld/rental';
import { destroyRentalPhotos, uploadRentalPhotos } from '@/lib/mediaworld/rental-uploads';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

const ownershipSelect = {
  id: true,
  providerId: true,
  photos: { orderBy: { position: 'asc' }, select: { id: true, url: true, publicId: true } },
  provider: { select: { userId: true } },
} as const;

async function loadOwnedListing(id: string, userId: string) {
  if (!/^[a-z0-9]{1,40}$/i.test(id)) return { notFound: true as const };
  const listing = await prisma.rentalListing.findUnique({ where: { id }, select: ownershipSelect });
  if (!listing) return { notFound: true as const };
  if (listing.provider.userId !== userId) return { forbidden: true as const };
  return { listing };
}

function fieldError(fields: Record<string, string[]>) {
  return NextResponse.json({ error: 'Please correct the highlighted fields.', fields }, { status: 400 });
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const { id } = await params;
    if (!/^[a-z0-9]{1,40}$/i.test(id)) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    const listing = await prisma.rentalListing.findUnique({
      where: { id },
      select: {
        ...rentalListingDetailSelect,
        provider: { select: { ...rentalProviderPublicSelect, description: true, userId: true } },
      },
    });
    if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    const isOwner = listing.provider.userId === user.id;
    if (!listing.isActive && !isOwner) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    return NextResponse.json({ listing, isOwner });
  } catch (error) {
    console.error('[for-rent/[id] GET] error:', error);
    return NextResponse.json({ error: 'Unable to load listing.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const { id } = await params;
    const owned = await loadOwnedListing(id, user.id);
    if ('notFound' in owned) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    if ('forbidden' in owned) return NextResponse.json({ error: 'You can only edit your own listing.' }, { status: 403 });
    const existing = owned.listing;

    const contentType = request.headers.get('content-type') ?? '';
    const isMultipart = contentType.startsWith('multipart/form-data');
    const formData = isMultipart ? await request.formData().catch(() => null) : null;
    if (isMultipart && !formData) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });

    const rawFields: Record<string, unknown> = formData
      ? formDataToFieldRecord(formData)
      : ((await request.json().catch(() => null)) as Record<string, unknown> | null) ?? {};

    const parsed = parseRentalListingUpdateFields(rawFields);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries({ ...parsed.data, isActive: rawFields.isActive })) {
      if (value !== undefined) updates[key] = value;
    }

    const newFiles = formData ? formImageFiles(formData) : [];
    const retainedIds = formData
      ? formData.getAll('retainedPhotoIds').filter((value): value is string => typeof value === 'string' && value.length > 0)
      : null;
    const touchesGallery = retainedIds !== null || newFiles.length > 0;

    if (Object.keys(updates).length === 0 && !touchesGallery) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    if (touchesGallery) {
      // Without an explicit keep-list, adding photos preserves the existing gallery.
      const retained = retainedIds ?? existing.photos.map((photo) => photo.id);
      const kept = existing.photos.filter((photo) => retained.includes(photo.id));
      if (kept.length !== retained.length) return fieldError({ photos: ['Some photos do not belong to this listing.'] });

      const finalCount = kept.length + newFiles.length;
      if (finalCount < 1) return fieldError({ photos: ['Keep at least one photo on the listing.'] });
      if (finalCount > MAX_RENTAL_PHOTOS) {
        return fieldError({ photos: [`A listing can have at most ${MAX_RENTAL_PHOTOS} photos (currently ${finalCount}).`] });
      }

      const uploaded = await uploadRentalPhotos(newFiles, existing.providerId);
      if ('error' in uploaded) return fieldError({ photos: [uploaded.error] });

      const gallery = [...kept.map((photo) => ({ url: photo.url, publicId: photo.publicId })), ...uploaded.photos];
      const removed = existing.photos.filter((photo) => !kept.includes(photo));
      try {
        await prisma.$transaction([
          prisma.rentalListingPhoto.deleteMany({ where: { listingId: existing.id } }),
          prisma.rentalListingPhoto.createMany({
            data: gallery.map((photo, position) => ({ listingId: existing.id, url: photo.url, publicId: photo.publicId, position })),
          }),
        ]);
      } catch {
        await destroyRentalPhotos(uploaded.photos.map((photo) => photo.publicId));
        return NextResponse.json({ error: 'Unable to update photos. Please try again.' }, { status: 500 });
      }
      await destroyRentalPhotos(removed.map((photo) => photo.publicId));
    }

    const listing = await prisma.rentalListing.update({
      where: { id: existing.id },
      data: updates,
      select: rentalListingDetailSelect,
    });
    return NextResponse.json({ listing });
  } catch (error) {
    console.error('[for-rent/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Unable to update listing.' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

    const { id } = await params;
    const owned = await loadOwnedListing(id, user.id);
    if ('notFound' in owned) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    if ('forbidden' in owned) return NextResponse.json({ error: 'You can only delete your own listing.' }, { status: 403 });

    await prisma.rentalListing.delete({ where: { id: owned.listing.id } });
    await destroyRentalPhotos(owned.listing.photos.map((photo) => photo.publicId));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[for-rent/[id] DELETE] error:', error);
    return NextResponse.json({ error: 'Unable to delete listing.' }, { status: 500 });
  }
}
