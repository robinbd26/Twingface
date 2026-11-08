import type { RentalAvailabilityValue, RentalBrowseInput, RentalPriceUnit } from './rental';

export type LocalizedText = { bn: string; en: string };

export function nodeName(node: { nameEn: string; nameBn: string }, bn: boolean): string {
  return bn ? node.nameBn : node.nameEn;
}

export const PRICE_UNIT_LABELS: Record<RentalPriceUnit, LocalizedText> = {
  PER_HOUR: { bn: 'প্রতি ঘণ্টা', en: 'per hour' },
  PER_DAY: { bn: 'প্রতিদিন', en: 'per day' },
  PER_WEEK: { bn: 'প্রতি সপ্তাহ', en: 'per week' },
  PER_MONTH: { bn: 'প্রতি মাস', en: 'per month' },
  CUSTOM: { bn: 'কাস্টম রেট', en: 'custom rate' },
};

export const AVAILABILITY_LABELS: Record<RentalAvailabilityValue, LocalizedText> = {
  AVAILABLE: { bn: 'পাওয়া যাচ্ছে', en: 'Available' },
  UNAVAILABLE: { bn: 'অনুপলব্ধ', en: 'Unavailable' },
  TEMPORARILY_UNAVAILABLE: { bn: 'সাময়িকভাবে বন্ধ', en: 'Temporarily unavailable' },
};

export type RentalBrowseSort = RentalBrowseInput['sort'];

export const BROWSE_SORT_LABELS: Record<RentalBrowseSort, LocalizedText> = {
  recent: { bn: 'নতুন আগে', en: 'Newest first' },
  price_asc: { bn: 'কম দাম আগে', en: 'Price: low to high' },
  price_desc: { bn: 'বেশি দাম আগে', en: 'Price: high to low' },
};

export function text(value: LocalizedText, bn: boolean): string {
  return bn ? value.bn : value.en;
}

const PRICE_FORMAT = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatRentalPrice(
  pricePaisa: number,
  priceUnit: RentalPriceUnit,
  priceCustom: string | null,
  bn: boolean,
): string {
  if (priceUnit === 'CUSTOM') return priceCustom || (bn ? 'কাস্টম রেট' : 'Custom rate');
  return `${PRICE_FORMAT.format(pricePaisa / 100)} / ${PRICE_UNIT_LABELS[priceUnit][bn ? 'bn' : 'en']}`;
}

export function formatRentalAvailability(availability: RentalAvailabilityValue, bn: boolean): string {
  return AVAILABILITY_LABELS[availability][bn ? 'bn' : 'en'];
}
