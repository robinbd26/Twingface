import { destroyPostImage, uploadRentalListingImage } from '../cloudinary';
import { isValidPostImageBytes, MAX_POST_IMAGE_BYTES, POST_IMAGE_MIME_TYPES } from '../post-media';
import { MAX_RENTAL_PHOTOS } from './rental';

export type UploadedRentalPhoto = { url: string; publicId: string };
export type RentalPhotoUpload = { error: string } | { photos: UploadedRentalPhoto[] };

export function validateRentalPhotoCount(files: File[], { required }: { required: boolean }): string | null {
  if (files.length > MAX_RENTAL_PHOTOS) return `Use at most ${MAX_RENTAL_PHOTOS} photos.`;
  if (required && files.length === 0) return 'Add at least one photo.';
  return null;
}

export async function uploadRentalPhotos(files: File[], providerId: string): Promise<RentalPhotoUpload> {
  const uploaded: UploadedRentalPhoto[] = [];

  for (const file of files) {
    if (!POST_IMAGE_MIME_TYPES.includes(file.type as (typeof POST_IMAGE_MIME_TYPES)[number]) || file.size > MAX_POST_IMAGE_BYTES) {
      await destroyRentalPhotos(uploaded.map((photo) => photo.publicId));
      return { error: 'Use JPEG, PNG, WebP or GIF photos under 5MB.' };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!isValidPostImageBytes(file.type, bytes)) {
      await destroyRentalPhotos(uploaded.map((photo) => photo.publicId));
      return { error: 'Choose valid image files.' };
    }
    try {
      const result = await uploadRentalListingImage({ bytes, mimeType: file.type, providerId });
      uploaded.push({ url: result.imageUrl, publicId: result.imagePublicId });
    } catch {
      await destroyRentalPhotos(uploaded.map((photo) => photo.publicId));
      return { error: 'Unable to upload photos. Please try again.' };
    }
  }

  return { photos: uploaded };
}

export async function destroyRentalPhotos(publicIds: string[]): Promise<void> {
  await Promise.all(publicIds.map(async (publicId) => {
    try {
      await destroyPostImage(publicId);
    } catch {
      // Cleanup is best effort; an orphaned asset is never worth a failed request.
    }
  }));
}
