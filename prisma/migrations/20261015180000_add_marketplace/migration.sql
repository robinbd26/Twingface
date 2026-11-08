-- CreateEnum
CREATE TYPE "MarketplaceCategory" AS ENUM ('ELECTRONICS', 'VEHICLES', 'PROPERTY', 'FURNITURE', 'FASHION', 'HOBBIES', 'OTHER');

-- CreateEnum
CREATE TYPE "MarketplaceCondition" AS ENUM ('NEW', 'USED');

-- CreateEnum
CREATE TYPE "MarketplaceStatus" AS ENUM ('AVAILABLE', 'SOLD_OUT');

-- AlterTable
ALTER TABLE "direct_conversations" ADD COLUMN "marketplaceMessagingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "direct_messages" ADD COLUMN "marketplaceListingId" TEXT;

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "pricePaisa" INTEGER NOT NULL,
    "category" "MarketplaceCategory" NOT NULL,
    "condition" "MarketplaceCondition" NOT NULL,
    "location" VARCHAR(120) NOT NULL,
    "status" "MarketplaceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_images" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "publicId" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "marketplace_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketplace_listings_sellerId_updatedAt_idx" ON "marketplace_listings"("sellerId", "updatedAt");
CREATE INDEX "marketplace_listings_status_createdAt_idx" ON "marketplace_listings"("status", "createdAt");
CREATE INDEX "marketplace_listings_category_status_createdAt_idx" ON "marketplace_listings"("category", "status", "createdAt");
CREATE UNIQUE INDEX "marketplace_images_listingId_position_key" ON "marketplace_images"("listingId", "position");

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketplace_images" ADD CONSTRAINT "marketplace_images_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_marketplaceListingId_fkey" FOREIGN KEY ("marketplaceListingId") REFERENCES "marketplace_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
