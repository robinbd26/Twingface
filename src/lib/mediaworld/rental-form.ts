import type { RentalListingDetailPage } from './rental';

export type RentalFieldGroup = 'vehicle' | 'location' | 'equipment';

/** Spec §7: vehicles, shooting locations and equipment ask for different attributes. */
export function rentalFieldGroup(code: string): RentalFieldGroup {
  if (code === 'VEHICLES') return 'vehicle';
  if (code === 'LOCATIONS') return 'location';
  return 'equipment';
}

export type RentalFormValues = {
  title: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  priceTaka: string;
  priceUnit: string;
  priceCustom: string;
  location: string;
  division: string;
  district: string;
  availability: string;
  contactPhone: string;
  contactEmail: string;
  terms: string;
  vehicleType: string;
  seatingCapacity: string;
  driverIncluded: boolean;
  roomCount: string;
  facilities: string;
  parkingAvailable: boolean;
  availableHours: string;
  brandModel: string;
  quantity: string;
  condition: string;
  accessories: string;
};

export const EMPTY_RENTAL_FORM: RentalFormValues = {
  title: '',
  description: '',
  categoryId: '',
  subcategoryId: '',
  priceTaka: '',
  priceUnit: 'PER_DAY',
  priceCustom: '',
  location: '',
  division: '',
  district: '',
  availability: 'AVAILABLE',
  contactPhone: '',
  contactEmail: '',
  terms: '',
  vehicleType: '',
  seatingCapacity: '',
  driverIncluded: false,
  roomCount: '',
  facilities: '',
  parkingAvailable: false,
  availableHours: '',
  brandModel: '',
  quantity: '',
  condition: '',
  accessories: '',
};

export function rentalFormFromListing(listing: RentalListingDetailPage): RentalFormValues {
  return {
    ...EMPTY_RENTAL_FORM,
    title: listing.title,
    description: listing.description,
    categoryId: listing.category.id,
    subcategoryId: listing.subcategory?.id ?? '',
    priceTaka: String(listing.pricePaisa / 100),
    priceUnit: listing.priceUnit,
    priceCustom: listing.priceCustom ?? '',
    location: listing.location,
    division: listing.division ?? '',
    district: listing.district ?? '',
    availability: listing.availability,
    contactPhone: listing.contactPhone ?? '',
    contactEmail: listing.contactEmail ?? '',
    terms: listing.terms ?? '',
    vehicleType: listing.vehicleType ?? '',
    seatingCapacity: listing.seatingCapacity ? String(listing.seatingCapacity) : '',
    driverIncluded: listing.driverIncluded ?? false,
    roomCount: listing.roomCount ? String(listing.roomCount) : '',
    facilities: listing.facilities ?? '',
    parkingAvailable: listing.parkingAvailable ?? false,
    availableHours: listing.availableHours ?? '',
    brandModel: listing.brandModel ?? '',
    quantity: listing.quantity ? String(listing.quantity) : '',
    condition: listing.condition ?? '',
    accessories: listing.accessories ?? '',
  };
}
