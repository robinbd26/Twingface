import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  config: vi.fn(),
  uploadStream: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock('cloudinary', () => ({
  v2: {
    config: mocks.config,
    uploader: {
      upload_stream: mocks.uploadStream,
      destroy: mocks.destroy,
    },
  },
}));

import { destroyPostImage, uploadMarketplaceImage, uploadPostImage, uploadProfileMedia } from './cloudinary';

describe('Cloudinary post image adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLOUDINARY_CLOUD_NAME = 'twingface-test';
    process.env.CLOUDINARY_API_KEY = 'key-for-test-only';
    process.env.CLOUDINARY_API_SECRET = 'secret-for-test-only';
  });

  it('uploads to the authenticated user post folder and returns safe provider fields', async () => {
    mocks.uploadStream.mockImplementation((options, callback) => ({
      end: (bytes: Buffer) => {
        expect(bytes).toEqual(Buffer.from('image-bytes'));
        callback(null, { secure_url: 'https://res.cloudinary.com/twingface-test/image/upload/posts/example.jpg', public_id: 'twingface/posts/user-a/post-a' });
      },
    }));

    await expect(uploadPostImage({ bytes: Buffer.from('image-bytes'), mimeType: 'image/jpeg', userId: 'user-a' }))
      .resolves.toEqual({
        imageUrl: 'https://res.cloudinary.com/twingface-test/image/upload/w_1600,c_limit,q_auto,f_auto/posts/example.jpg',
        imagePublicId: 'twingface/posts/user-a/post-a',
      });

    expect(mocks.config).toHaveBeenCalledWith({ cloud_name: 'twingface-test', api_key: 'key-for-test-only', api_secret: 'secret-for-test-only', secure: true });
    expect(mocks.uploadStream).toHaveBeenCalledWith(expect.objectContaining({
      folder: 'twingface/posts/user-a',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    }), expect.any(Function));
    // Deriving at upload leaves secure_url untransformed, so the transformation lives in the URL instead.
    expect(mocks.uploadStream.mock.calls[0][0].transformation).toBeUndefined();
  });

  it('rejects an incomplete provider upload response', async () => {
    mocks.uploadStream.mockImplementation((_options, callback) => ({ end: () => callback(null, { secure_url: 'http://unsafe.example/image.jpg' }) }));
    await expect(uploadPostImage({ bytes: Buffer.from('image-bytes'), mimeType: 'image/jpeg', userId: 'user-a' }))
      .rejects.toThrow('Image upload failed.');
  });

  it('uploads marketplace media to the seller folder with a generated internal ID', async () => {
    mocks.uploadStream.mockImplementation((_options, callback) => ({
      end: () => callback(null, {
        secure_url: 'https://res.cloudinary.com/twingface-test/image/upload/twingface/marketplace/seller-a/item.jpg',
        public_id: 'twingface/marketplace/seller-a/generated-id',
      }),
    }));

    await expect(uploadMarketplaceImage({ bytes: Buffer.from('image-bytes'), mimeType: 'image/png', sellerId: 'seller-a' }))
      .resolves.toEqual({
        imageUrl: 'https://res.cloudinary.com/twingface-test/image/upload/w_1600,c_limit,q_auto,f_auto/twingface/marketplace/seller-a/item.jpg',
        imagePublicId: 'twingface/marketplace/seller-a/generated-id',
      });

    expect(mocks.uploadStream).toHaveBeenCalledWith(expect.objectContaining({
      folder: 'twingface/marketplace/seller-a',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    }), expect.any(Function));
  });

  it('destroys only the supplied internal public ID', async () => {
    mocks.destroy.mockResolvedValue({ result: 'ok' });
    await destroyPostImage('twingface/posts/user-a/post-a');
    expect(mocks.destroy).toHaveBeenCalledWith('twingface/posts/user-a/post-a', { resource_type: 'image', invalidate: true });
  });

  it.each([
    ['profile', 'avatar', 'w_512,h_512,c_fill,g_face,q_auto,f_auto'],
    ['cover', 'cover', 'w_1600,h_640,c_limit,q_auto,f_auto'],
  ] as const)('uploads %s media to its deterministic user asset path', async (kind, publicId, delivery) => {
    mocks.uploadStream.mockImplementation((options, callback) => ({
      end: () => callback(null, {
        secure_url: `https://res.cloudinary.com/twingface-test/image/upload/twingface/profiles/user-a/${publicId}.jpg`,
        public_id: `twingface/profiles/user-a/${publicId}`,
      }),
    }));

    await expect(uploadProfileMedia({ bytes: Buffer.from('image-bytes'), mimeType: 'image/jpeg', userId: 'user-a', kind }))
      .resolves.toEqual({ imageUrl: `https://res.cloudinary.com/twingface-test/image/upload/${delivery}/twingface/profiles/user-a/${publicId}.jpg` });

    expect(mocks.uploadStream).toHaveBeenCalledWith(expect.objectContaining({
      folder: 'twingface/profiles/user-a',
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    }), expect.any(Function));
  });
});
