import { describe, expect, it } from 'vitest';
import { MAX_MARKETPLACE_IMAGES, parseMarketplaceBrowseInput, parseMarketplaceCreateInput, parseMarketplaceUpdateInput, safeMarketplaceListingSelect } from './marketplace';
import { MAX_POST_IMAGE_BYTES } from './post-media';

const image = (type = 'image/jpeg', size = 4) => new File([new Uint8Array(size)], 'item.jpg', { type });

function validForm(images: File[] = [image()]) {
  const formData = new FormData();
  formData.set('title', '  Vintage camera  ');
  formData.set('description', '  A fully working camera in excellent condition.  ');
  formData.set('price', '1250.50');
  formData.set('category', 'ELECTRONICS');
  formData.set('condition', 'USED');
  formData.set('location', '  Dhaka  ');
  images.forEach((file) => formData.append('images', file));
  return formData;
}

describe('marketplace validation and safe projections', () => {
  it('normalizes a valid one-image listing and stores BDT exactly as paisa', () => {
    const result = parseMarketplaceCreateInput(validForm());
    expect(result).toMatchObject({
      success: true,
      data: {
        title: 'Vintage camera',
        description: 'A fully working camera in excellent condition.',
        pricePaisa: 125050,
        category: 'ELECTRONICS',
        condition: 'USED',
        location: 'Dhaka',
      },
    });
  });

  it.each([
    ['no images', []],
    ['eleven images', Array.from({ length: MAX_MARKETPLACE_IMAGES + 1 }, () => image())],
    ['unsupported image', [image('application/pdf')]],
    ['oversized image', [image('image/jpeg', MAX_POST_IMAGE_BYTES + 1)]],
  ])('rejects %s before upload', (_label, images) => {
    expect(parseMarketplaceCreateInput(validForm(images)).success).toBe(false);
  });

  it.each([
    ['category', 'NOT_A_CATEGORY'],
    ['condition', 'REFURBISHED'],
    ['price', '-0.01'],
    ['price', '20.123'],
    ['title', 'ab'],
    ['location', 'x'],
    ['description', 'too short'],
  ])('rejects invalid listing field %s', (field, value) => {
    const formData = validForm();
    formData.set(field, value);
    expect(parseMarketplaceCreateInput(formData).success).toBe(false);
  });

  it('bounds browse filters and exposes only safe listing data', () => {
    expect(parseMarketplaceBrowseInput(new URLSearchParams('limit=999&category=FASHION&q=  jacket  '))).toEqual({
      cursor: null,
      limit: 30,
      category: 'FASHION',
      query: 'jacket',
    });
    const serialized = JSON.stringify(safeMarketplaceListingSelect);
    expect(safeMarketplaceListingSelect).toMatchObject({
      images: { select: { url: true, position: true } },
      seller: { select: { id: true, name: true, username: true, profileImage: true } },
    });
    expect(serialized).not.toMatch(/publicId|email|phone|passwordHash|sessions/i);
  });

  it('accepts an image-only update and rejects prices beyond Prisma Int capacity', () => {
    const update = new FormData();
    update.append('images', image());
    expect(parseMarketplaceUpdateInput(update).success).toBe(true);
    const expensive = validForm();
    expensive.set('price', '21474836.48');
    expect(parseMarketplaceCreateInput(expensive).success).toBe(false);
  });
});
