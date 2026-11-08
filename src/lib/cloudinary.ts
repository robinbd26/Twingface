import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import type { ProfileMediaKind } from './profile-media';

type UploadPostImageInput = {
  bytes: Buffer;
  mimeType: string;
  userId: string;
};

type UploadedPostImage = {
  imageUrl: string;
  imagePublicId: string;
};

type UploadProfileMediaInput = {
  bytes: Buffer;
  mimeType: string;
  userId: string;
  kind: ProfileMediaKind;
};

function configureCloudinary() {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
  if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary is not configured.');
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

// The delivery transformation has to live in the URL we store: passing it to
// upload_stream only derives an asset and leaves secure_url pointing at the
// original, so every stored image would be served unconverted.
const LARGE_DELIVERY = 'w_1600,c_limit,q_auto,f_auto';
const LOGO_DELIVERY = 'w_512,h_512,c_fill,q_auto,f_auto';
const AVATAR_DELIVERY = 'w_512,h_512,c_fill,g_face,q_auto,f_auto';
const COVER_DELIVERY = 'w_1600,h_640,c_limit,q_auto,f_auto';
const SHOWCASE_DELIVERY = 'w_1200,c_limit,q_auto,f_auto';

function deliveryUrl(secureUrl: string, transformation: string): string {
  return secureUrl.replace('/upload/', `/upload/${transformation}/`);
}

export async function uploadPostImage({ bytes, mimeType, userId }: UploadPostImageInput): Promise<UploadedPostImage> {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `twingface/posts/${userId}`,
      public_id: randomUUID(),
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      format: mimeType.split('/')[1],
    }, (error, result) => {
      if (error || !result || !result.public_id || !result.secure_url?.startsWith('https://')) {
        reject(new Error('Image upload failed.'));
        return;
      }
      resolve({ imageUrl: deliveryUrl(result.secure_url, LARGE_DELIVERY), imagePublicId: result.public_id });
    });
    stream.end(bytes);
  });
}

export async function uploadMarketplaceImage({ bytes, mimeType, sellerId }: { bytes: Buffer; mimeType: string; sellerId: string }): Promise<UploadedPostImage> {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `twingface/marketplace/${sellerId}`,
      public_id: randomUUID(),
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      format: mimeType.split('/')[1],
    }, (error, result) => {
      if (error || !result || !result.public_id || !result.secure_url?.startsWith('https://')) {
        reject(new Error('Image upload failed.'));
        return;
      }
      resolve({ imageUrl: deliveryUrl(result.secure_url, LARGE_DELIVERY), imagePublicId: result.public_id });
    });
    stream.end(bytes);
  });
}

export async function uploadRentalListingImage(
  { bytes, mimeType, providerId }: { bytes: Buffer; mimeType: string; providerId: string },
): Promise<UploadedPostImage> {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `twingface/rentals/${providerId}`,
      public_id: randomUUID(),
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      format: mimeType.split('/')[1],
    }, (error, result) => {
      if (error || !result || !result.public_id || !result.secure_url?.startsWith('https://')) {
        reject(new Error('Image upload failed.'));
        return;
      }
      resolve({ imageUrl: deliveryUrl(result.secure_url, LARGE_DELIVERY), imagePublicId: result.public_id });
    });
    stream.end(bytes);
  });
}

export async function destroyPostImage(imagePublicId: string): Promise<void> {
  configureCloudinary();
  await cloudinary.uploader.destroy(imagePublicId, { resource_type: 'image', invalidate: true });
}

export async function uploadMediaWorldLogo(
  { bytes, mimeType, userId, kind }: { bytes: Buffer; mimeType: string; userId: string; kind: 'provider' | 'organization' },
): Promise<UploadedPostImage> {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `twingface/mediaworld/${kind}/${userId}`,
      public_id: 'logo',
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      format: mimeType.split('/')[1],
    }, (error, result) => {
      if (error || !result || !result.public_id || !result.secure_url?.startsWith('https://')) {
        reject(new Error('Image upload failed.'));
        return;
      }
      resolve({ imageUrl: deliveryUrl(result.secure_url, LOGO_DELIVERY), imagePublicId: result.public_id });
    });
    stream.end(bytes);
  });
}

type PageMediaKind = 'avatar' | 'cover';

type UploadPageMediaInput = {
  bytes: Buffer;
  mimeType: string;
  pageId: string;
  kind: PageMediaKind;
};

export async function uploadPageMedia({ bytes, mimeType, pageId, kind }: UploadPageMediaInput): Promise<{ imageUrl: string }> {
  configureCloudinary();

  const delivery = kind === 'avatar' ? LOGO_DELIVERY : COVER_DELIVERY;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `twingface/pages/${pageId}`,
      public_id: kind,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      format: mimeType.split('/')[1],
    }, (error, result) => {
      if (error || !result || !result.secure_url?.startsWith('https://')) {
        reject(new Error('Image upload failed.'));
        return;
      }
      resolve({ imageUrl: deliveryUrl(result.secure_url, delivery) });
    });
    stream.end(bytes);
  });
}

export async function uploadPagePostImage({ bytes, mimeType, pageId }: { bytes: Buffer; mimeType: string; pageId: string }): Promise<{ imageUrl: string; imagePublicId: string }> {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `twingface/pages/${pageId}/posts`,
      public_id: randomUUID(),
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      format: mimeType.split('/')[1],
    }, (error, result) => {
      if (error || !result || !result.public_id || !result.secure_url?.startsWith('https://')) {
        reject(new Error('Image upload failed.'));
        return;
      }
      resolve({ imageUrl: deliveryUrl(result.secure_url, LARGE_DELIVERY), imagePublicId: result.public_id });
    });
    stream.end(bytes);
  });
}

export async function destroyPageMedia(pageId: string): Promise<void> {
  configureCloudinary();
  await cloudinary.api.delete_resources_by_prefix(`twingface/pages/${pageId}`, { invalidate: true });
}

export async function uploadProfileMedia({ bytes, mimeType, userId, kind }: UploadProfileMediaInput): Promise<{ imageUrl: string }> {
  configureCloudinary();

  const publicId = kind === 'profile' ? 'avatar' : 'cover';
  const delivery = kind === 'profile' ? AVATAR_DELIVERY : COVER_DELIVERY;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `twingface/profiles/${userId}`,
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      format: mimeType.split('/')[1],
    }, (error, result) => {
      if (error || !result || !result.secure_url?.startsWith('https://')) {
        reject(new Error('Image upload failed.'));
        return;
      }
      resolve({ imageUrl: deliveryUrl(result.secure_url, delivery) });
    });
    stream.end(bytes);
  });
}

type UploadShowcasePhotoInput = {
  bytes: Buffer;
  mimeType: string;
  userId: string;
};

export async function uploadShowcasePhoto({ bytes, mimeType, userId }: UploadShowcasePhotoInput): Promise<{ imageUrl: string; imagePublicId: string }> {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `twingface/mediaworld/showcase/${userId}`,
      public_id: randomUUID(),
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      format: mimeType.split('/')[1],
    }, (error, result) => {
      if (error || !result || !result.public_id || !result.secure_url?.startsWith('https://')) {
        reject(new Error('Image upload failed.'));
        return;
      }
      resolve({ imageUrl: deliveryUrl(result.secure_url, SHOWCASE_DELIVERY), imagePublicId: result.public_id });
    });
    stream.end(bytes);
  });
}

/** Best-effort cleanup of a showcase photo; a failed destroy never blocks deleting the row. */
export async function destroyShowcasePhoto(publicId: string): Promise<void> {
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
}

type UploadComplaintMediaInput = {
  bytes: Buffer;
  mimeType: string;
  userId: string;
};export async function uploadComplaintImage({ bytes, mimeType, userId }: UploadComplaintMediaInput): Promise<UploadedPostImage> {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `twingface/mediaworld/complaints/${userId}`,
      public_id: randomUUID(),
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      format: mimeType.split('/')[1],
    }, (error, result) => {
      if (error || !result || !result.public_id || !result.secure_url?.startsWith('https://')) {
        reject(new Error('Image upload failed.'));
        return;
      }
      resolve({ imageUrl: deliveryUrl(result.secure_url, LARGE_DELIVERY), imagePublicId: result.public_id });
    });
    stream.end(bytes);
  });
}

export async function uploadComplaintVideo({ bytes, mimeType, userId }: UploadComplaintMediaInput): Promise<UploadedPostImage> {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `twingface/mediaworld/complaints/${userId}`,
      public_id: randomUUID(),
      resource_type: 'video',
      allowed_formats: ['mp4', 'webm', 'mov', 'm4v'],
      format: mimeType.split('/')[1],
      transformation: [{ width: 1280, crop: 'limit', quality: 'auto' }],
    }, (error, result) => {
      if (error || !result || !result.public_id || !result.secure_url?.startsWith('https://')) {
        reject(new Error('Video upload failed.'));
        return;
      }
      resolve({ imageUrl: result.secure_url, imagePublicId: result.public_id });
    });
    stream.end(bytes);
  });
}

export async function destroyComplaintMedia(publicIds: string[], resourceType: 'image' | 'video' = 'image'): Promise<void> {
  if (!publicIds.length) return;
  configureCloudinary();
  await Promise.all(publicIds.map(async (publicId) => {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
    } catch {
      /* cleanup is best effort */
    }
  }));
}
