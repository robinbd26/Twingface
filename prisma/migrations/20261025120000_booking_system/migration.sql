-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "renterId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "priceUnit" "PriceUnit" NOT NULL,
    "unitPricePaisa" INTEGER NOT NULL,
    "priceCustom" VARCHAR(80),
    "totalPaisa" INTEGER,
    "note" VARCHAR(1000),
    "decisionNote" VARCHAR(1000),
    "decidedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "actorId" TEXT,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_availability_blocks" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_availability_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookings_listingId_status_startAt_endAt_idx" ON "bookings"("listingId", "status", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "bookings_renterId_createdAt_idx" ON "bookings"("renterId", "createdAt");

-- CreateIndex
CREATE INDEX "bookings_status_endAt_idx" ON "bookings"("status", "endAt");

-- CreateIndex
CREATE INDEX "booking_status_history_bookingId_createdAt_idx" ON "booking_status_history"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "rental_availability_blocks_listingId_startAt_idx" ON "rental_availability_blocks"("listingId", "startAt");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "rental_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_availability_blocks" ADD CONSTRAINT "rental_availability_blocks_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "rental_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_availability_blocks" ADD CONSTRAINT "rental_availability_blocks_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "rental_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

