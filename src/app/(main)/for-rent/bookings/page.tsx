import { redirect } from 'next/navigation';
import DashboardNavbar from '@/components/dashboard/dashboard-navbar';
import ForRentBookings, { type PlacedBlock, type ProviderListing } from '@/components/for-rent/for-rent-bookings';
import { MediaWorldLanguageProvider } from '@/components/mediaworld/mediaworld-language';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  availabilityBlockSelect,
  bookingListSelect,
  serializeBlock,
  serializeBooking,
} from '@/lib/bookings/booking';

export const metadata = { title: 'My bookings - TwingFace Media World' };

export default async function ForRentBookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const provider = await prisma.rentalProvider.findUnique({ where: { userId: user.id }, select: { id: true } });

  const [renterRows, providerRows, listingRows, blockRows] = await Promise.all([
    prisma.booking.findMany({
      where: { renterId: user.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
      select: bookingListSelect,
    }),
    provider
      ? prisma.booking.findMany({
          where: { listing: { providerId: provider.id } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 100,
          select: bookingListSelect,
        })
      : Promise.resolve([]),
    provider
      ? prisma.rentalListing.findMany({
          where: { providerId: provider.id },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            title: true,
            pricePaisa: true,
            priceUnit: true,
            priceCustom: true,
            availability: true,
            isActive: true,
            photos: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
          },
        })
      : Promise.resolve([]),
    provider
      ? prisma.rentalAvailabilityBlock.findMany({
          where: { providerId: provider.id },
          orderBy: [{ startAt: 'asc' }],
          select: { ...availabilityBlockSelect, listingId: true },
        })
      : Promise.resolve([]),
  ]);

  const listings: ProviderListing[] = listingRows.map((row) => ({
    id: row.id,
    title: row.title,
    pricePaisa: row.pricePaisa,
    priceUnit: row.priceUnit,
    priceCustom: row.priceCustom,
    availability: row.availability,
    isActive: row.isActive,
    photoUrl: row.photos[0]?.url ?? null,
  }));

  const blocks: PlacedBlock[] = blockRows.map((row) => ({
    ...serializeBlock(row),
    listingId: row.listingId,
  }));

  return (
    <div className='app-shell page-enter' data-theme='dark'>
      <DashboardNavbar user={user} />
      <main className='mw-rent-page'>
        <MediaWorldLanguageProvider>
          <ForRentBookings
            renter={renterRows.map(serializeBooking)}
            provider={providerRows.map(serializeBooking)}
            isProvider={Boolean(provider)}
            listings={listings}
            blocks={blocks}
          />
        </MediaWorldLanguageProvider>
      </main>
    </div>
  );
}
