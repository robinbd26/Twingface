import type { LocalizedText } from './labels';
import type { RentalListingDetail } from './rental';

export type RentalSpecRow = { label: LocalizedText; value: LocalizedText };

const YES: LocalizedText = { bn: 'হ্যাঁ', en: 'Yes' };
const NO: LocalizedText = { bn: 'না', en: 'No' };

/** Category-independent text values read the same in both languages. */
function plain(value: string): LocalizedText {
  return { bn: value, en: value };
}

/**
 * Only the attributes the provider actually filled in are shown, so vehicle,
 * shooting-house and equipment listings each read as their own kind of listing.
 */
export function rentalSpecRows(listing: RentalListingDetail): RentalSpecRow[] {
  const rows: RentalSpecRow[] = [];
  const add = (label: LocalizedText, value: LocalizedText | null) => {
    if (value) rows.push({ label, value });
  };

  add({ bn: 'যানবাহনের ধরন', en: 'Vehicle type' }, listing.vehicleType ? plain(listing.vehicleType) : null);
  add({ bn: 'আসন ক্ষমতা', en: 'Seating capacity' }, listing.seatingCapacity ? plain(String(listing.seatingCapacity)) : null);
  add({ bn: 'চালকসহ', en: 'Driver included' }, listing.driverIncluded === null ? null : listing.driverIncluded ? YES : NO);
  add({ bn: 'কক্ষ সংখ্যা', en: 'Room count' }, listing.roomCount ? plain(String(listing.roomCount)) : null);
  add({ bn: 'সুবিধাসমূহ', en: 'Facilities' }, listing.facilities ? plain(listing.facilities) : null);
  add({ bn: 'পার্কিং', en: 'Parking available' }, listing.parkingAvailable === null ? null : listing.parkingAvailable ? YES : NO);
  add({ bn: 'সময়', en: 'Available hours' }, listing.availableHours ? plain(listing.availableHours) : null);
  add({ bn: 'ব্র্যান্ড ও মডেল', en: 'Brand & model' }, listing.brandModel ? plain(listing.brandModel) : null);
  add({ bn: 'পরিমাণ', en: 'Quantity' }, listing.quantity ? plain(String(listing.quantity)) : null);
  add({ bn: 'অবস্থা', en: 'Condition' }, listing.condition ? plain(listing.condition) : null);
  add({ bn: 'এক্সেসরিজ', en: 'Accessories' }, listing.accessories ? plain(listing.accessories) : null);
  add({ bn: 'বিভাগ', en: 'Division' }, listing.division ? plain(listing.division) : null);
  add({ bn: 'জেলা', en: 'District' }, listing.district ? plain(listing.district) : null);

  return rows;
}
