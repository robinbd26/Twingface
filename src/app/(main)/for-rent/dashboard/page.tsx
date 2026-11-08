import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import ForRentDashboard, {
  type RentAccount,
  type RentBlock,
  type RentBooking,
  type RentInquiry,
  type RentItem,
} from '@/components/for-rent/for-rent-dashboard';
import { MediaWorldLanguageProvider } from '@/components/mediaworld/mediaworld-language';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { availabilityBlockSelect, bookingListSelect, serializeBooking, type BookingListRow } from '@/lib/bookings/booking';
import { rentalListingCardSelect } from '@/lib/mediaworld/rental';

export const metadata = { title: 'Rental dashboard - TwingFace Media World' };

const providerSelect = {
  id: true,
  businessName: true,
  ownerName: true,
  location: true,
  logoUrl: true,
  description: true,
  phone: true,
  email: true,
} as const;

const inquirySelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  message: true,
  status: true,
  createdAt: true,
  listing: { select: { id: true, title: true } },
  user: { select: { name: true, username: true } },
} as const;

type InquiryRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: 'PENDING' | 'REPLIED' | 'ARCHIVED';
  createdAt: Date;
  listing: { id: string; title: string };
  user: { name: string; username: string };
};

/** Received inquiries link the sender; a renter's own sent list must not repeat it back. */
function toInquiry(row: InquiryRow, showSender: boolean): RentInquiry {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    listing: row.listing,
    sender: showSender ? row.user : null,
  };
}

function toBooking(row: BookingListRow, side: 'provider' | 'renter'): RentBooking {
  const booking = serializeBooking(row);
  return {
    id: booking.id,
    status: booking.status,
    startAt: booking.startAt,
    endAt: booking.endAt,
    priceUnit: booking.priceUnit,
    totalPaisa: booking.totalPaisa,
    listingId: booking.listing.id,
    listingTitle: booking.listing.title,
    counterparty: side === 'provider'
      ? `@${booking.renter.username}`
      : booking.listing.provider.businessName || booking.listing.provider.ownerName,
  };
}

export default async function ForRentDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      accountType: true,
      division: true,
      district: true,
      coverImage: true,
      rentalProvider: { select: providerSelect },
    },
  });
  if (!account) redirect('/login');

  const provider = account.rentalProvider;

  const [listingRows, receivedRows, sentRows, providerBookingRows, renterBookingRows, blockRows] = await Promise.all([
    provider
      ? prisma.rentalListing.findMany({
          where: { providerId: provider.id },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          select: { ...rentalListingCardSelect, _count: { select: { inquiries: true } } },
        })
      : Promise.resolve([]),
    provider
      ? prisma.inquiry.findMany({
          where: { listing: { providerId: provider.id } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 100,
          select: inquirySelect,
        })
      : Promise.resolve([]),
    prisma.inquiry.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
      select: inquirySelect,
    }),
    provider
      ? prisma.booking.findMany({
          where: { listing: { providerId: provider.id } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 100,
          select: bookingListSelect,
        })
      : Promise.resolve([]),
    prisma.booking.findMany({
      where: { renterId: user.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
      select: bookingListSelect,
    }),
    provider
      ? prisma.rentalAvailabilityBlock.findMany({
          where: { providerId: provider.id, endAt: { gte: new Date() } },
          orderBy: [{ startAt: 'asc' }],
          take: 20,
          select: { ...availabilityBlockSelect, listingId: true, listing: { select: { title: true } } },
        })
      : Promise.resolve([]),
  ]);

  const listings: RentItem[] = listingRows.map((row) => ({
    id: row.id,
    title: row.title,
    pricePaisa: row.pricePaisa,
    priceUnit: row.priceUnit,
    priceCustom: row.priceCustom,
    location: row.location,
    division: row.division,
    availability: row.availability,
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
    photoUrl: row.photos[0]?.url ?? null,
    categoryCode: row.category.code,
    categoryName: { bn: row.category.nameBn, en: row.category.nameEn },
    subcategoryName: row.subcategory ? { bn: row.subcategory.nameBn, en: row.subcategory.nameEn } : null,
    inquiryCount: row._count.inquiries,
  }));

  const blocks: RentBlock[] = blockRows.map((row) => ({
    id: row.id,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    reason: row.reason,
    listingId: row.listingId,
    listingTitle: row.listing.title,
  }));

  const view: RentAccount = {
    name: user.name,
    username: user.username,
    accountType: account.accountType,
    avatarUrl: user.profileImage,
    coverUrl: account.coverImage,
    division: account.division,
    district: account.district,
  };

  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={user} />
      <main className='mw-rent-page max-w-none! px-0! py-0!'>
        <MediaWorldLanguageProvider>
          <ForRentDashboard
            account={view}
            provider={provider}
            listings={listings}
            received={receivedRows.map((row) => toInquiry(row, true))}
            sent={sentRows.map((row) => toInquiry(row, false))}
            providerBookings={providerBookingRows.map((row) => toBooking(row, 'provider'))}
            renterBookings={renterBookingRows.map((row) => toBooking(row, 'renter'))}
            blocks={blocks}
          />
        </MediaWorldLanguageProvider>
      </main>
    </div>
  );
}
