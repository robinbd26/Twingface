import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  RentalListingCoreSchema,
  UpdateRentalListingSchema,
  parseRentalListingFields,
  parseRentalListingUpdateFields,
  rentalListingCardSelect,
  rentalListingDetailPageSelect,
  rentalListingDetailSelect,
} from './rental';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const base = {
  title: 'ARRI Alexa Mini',
  description: 'Rental camera body with prime lenses included.',
  categoryId: 'cat-1',
  location: 'Dhanmondi, Dhaka',
};

describe('rental listing price rules', () => {
  it('lets a custom rate stand in for a numeric price', () => {
    const parsed = RentalListingCoreSchema.safeParse({ ...base, priceUnit: 'CUSTOM', priceCustom: 'Call for weekly rate' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.pricePaisa).toBe(0);
  });

  it('requires a description for a custom rate', () => {
    const parsed = RentalListingCoreSchema.safeParse({ ...base, priceUnit: 'CUSTOM' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.flatten().fieldErrors.priceCustom).toEqual(['Describe the custom price.']);
  });

  it('requires a positive price for every fixed unit', () => {
    for (const priceUnit of ['PER_HOUR', 'PER_DAY', 'PER_WEEK', 'PER_MONTH']) {
      const parsed = RentalListingCoreSchema.safeParse({ ...base, priceUnit });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.pricePaisa).toEqual(['Enter a price above 0 or choose a custom price.']);
      }
    }
    expect(RentalListingCoreSchema.safeParse({ ...base, priceUnit: 'PER_DAY', pricePaisa: 1200000 }).success).toBe(true);
  });
});

describe('rental listing district rule', () => {
  it('rejects a district outside the chosen division', () => {
    const parsed = RentalListingCoreSchema.safeParse({ ...base, priceUnit: 'PER_DAY', pricePaisa: 5000, division: 'Rangpur', district: 'Nilphamari' });
    expect(parsed.success).toBe(true);
    const mismatch = RentalListingCoreSchema.safeParse({ ...base, priceUnit: 'PER_DAY', pricePaisa: 5000, division: 'Rangpur', district: 'Cox\'s Bazar' });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.error.flatten().fieldErrors.district).toEqual(['Cox\'s Bazar is not in Rangpur division.']);
    }
  });
});

describe('rental listing update rules', () => {
  it('does not invent a price when a partial update omits one', () => {
    const parsed = UpdateRentalListingSchema.safeParse({ title: 'Renamed listing' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.pricePaisa).toBeUndefined();
  });

  it('keeps validating a supplied price against the unit', () => {
    const parsed = UpdateRentalListingSchema.safeParse({ priceUnit: 'PER_DAY' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.flatten().fieldErrors.pricePaisa).toBeDefined();
  });
});

describe('rental listing form parsing', () => {
  it('maps blank form fields to absent values and numeric text to numbers', () => {
    const parsed = parseRentalListingFields({
      title: '  Shooting crane  ',
      description: 'A 12 metre crane available for outdoor shoots.',
      categoryId: 'cat-1',
      location: 'Uttara, Dhaka',
      priceUnit: 'PER_DAY',
      pricePaisa: '900000',
      subcategoryId: '',
      seatingCapacity: '',
      driverIncluded: '',
      division: '',
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toMatchObject({ title: 'Shooting crane', pricePaisa: 900000, driverIncluded: undefined, division: undefined });
    expect(parsed.data.subcategoryId).toBeUndefined();
  });

  it('reports field errors for an unparsable update body', () => {
    const parsed = parseRentalListingUpdateFields({ pricePaisa: 'abc' });
    expect(parsed.success).toBe(false);
  });
});

describe('rental provider contact privacy', () => {
  it('never reads the provider account phone or email into a listing payload', () => {
    for (const providerSelect of [
      rentalListingCardSelect.provider.select,
      rentalListingDetailSelect.provider.select,
      rentalListingDetailPageSelect.provider.select,
    ]) {
      expect(providerSelect).not.toHaveProperty('phone');
      expect(providerSelect).not.toHaveProperty('email');
    }
  });

  it('keeps the listing detail API on the contact-free provider projection', () => {
    const route = source('src/app/api/for-rent/[id]/route.ts');
    expect(route).toContain('provider: { select: { ...rentalProviderPublicSelect, description: true, userId: true } }');
    expect(route).not.toContain('phone: true');
    expect(route).not.toContain('email: true');
  });

  it('shows only the contact values published on the listing itself', () => {
    const detail = source('src/components/for-rent/for-rent-detail.tsx');
    expect(detail).toContain('const phone = listing.contactPhone;');
    expect(detail).toContain('const email = listing.contactEmail;');
    expect(detail).not.toContain('provider.phone');
    expect(detail).not.toContain('provider.email');
  });
});
