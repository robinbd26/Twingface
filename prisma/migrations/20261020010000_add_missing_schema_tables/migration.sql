-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FRIEND_REQUEST', 'FRIEND_ACCEPT', 'MESSAGE');

-- CreateEnum
CREATE TYPE "ListingCondition" AS ENUM ('NEW', 'USED_LIKE_NEW', 'USED_GOOD', 'USED_FAIR');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('AVAILABLE', 'SOLD');

-- CreateEnum
CREATE TYPE "MediaProfileStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MarketplaceCategory" ADD VALUE 'STORY_WRITER';
ALTER TYPE "MarketplaceCategory" ADD VALUE 'DIRECTOR';
ALTER TYPE "MarketplaceCategory" ADD VALUE 'ARTIST';
ALTER TYPE "MarketplaceCategory" ADD VALUE 'PRODUCER';
ALTER TYPE "MarketplaceCategory" ADD VALUE 'DOP';
ALTER TYPE "MarketplaceCategory" ADD VALUE 'CAMERA_HOUSE';
ALTER TYPE "MarketplaceCategory" ADD VALUE 'SHOOTING_HOUSE';
ALTER TYPE "MarketplaceCategory" ADD VALUE 'MAKEUP_MAN';
ALTER TYPE "MarketplaceCategory" ADD VALUE 'PRODUCTION';
ALTER TYPE "MarketplaceCategory" ADD VALUE 'SHOOTING_BUS_CAR';
ALTER TYPE "MarketplaceCategory" ADD VALUE 'LIGHT_HOUSE';

-- AlterTable
ALTER TABLE "direct_messages" ADD COLUMN     "attachments" TEXT[],
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "handle" VARCHAR(30) NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "bio" VARCHAR(500),
    "avatarUrl" VARCHAR(500),
    "avatarPublicId" VARCHAR(255),
    "coverUrl" VARCHAR(500),
    "coverPublicId" VARCHAR(255),
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_posts" (
    "id" TEXT NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "imageUrl" VARCHAR(500),
    "imagePublicId" VARCHAR(255),
    "pageId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_presence" (
    "userId" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_presence_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "entityId" VARCHAR(40),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(280),
    "imageUrl" VARCHAR(500) NOT NULL,
    "imagePublicId" VARCHAR(255),
    "destinationUrl" VARCHAR(500) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" VARCHAR(100) NOT NULL,
    "profession" "MarketplaceCategory" NOT NULL,
    "bio" VARCHAR(500) NOT NULL,
    "photoUrl" VARCHAR(500),
    "division" VARCHAR(30) NOT NULL,
    "district" VARCHAR(30) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "portfolio" VARCHAR(2000),
    "experience" VARCHAR(200),
    "status" "MediaProfileStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "price" INTEGER NOT NULL,
    "description" VARCHAR(1000),
    "category" VARCHAR(40) NOT NULL,
    "condition" "ListingCondition" NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" VARCHAR(120),
    "imageUrl" VARCHAR(500),
    "imagePublicId" VARCHAR(255),
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pages_handle_key" ON "pages"("handle");

-- CreateIndex
CREATE INDEX "pages_ownerId_idx" ON "pages"("ownerId");

-- CreateIndex
CREATE INDEX "pages_handle_idx" ON "pages"("handle");

-- CreateIndex
CREATE INDEX "page_posts_pageId_createdAt_idx" ON "page_posts"("pageId", "createdAt");

-- CreateIndex
CREATE INDEX "page_posts_authorId_idx" ON "page_posts"("authorId");

-- CreateIndex
CREATE INDEX "user_presence_isOnline_idx" ON "user_presence"("isOnline");

-- CreateIndex
CREATE INDEX "notifications_recipientId_isRead_createdAt_idx" ON "notifications"("recipientId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_recipientId_createdAt_idx" ON "notifications"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "ads_isActive_createdAt_idx" ON "ads"("isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "media_profiles_userId_key" ON "media_profiles"("userId");

-- CreateIndex
CREATE INDEX "media_profiles_status_createdAt_idx" ON "media_profiles"("status", "createdAt");

-- CreateIndex
CREATE INDEX "media_profiles_profession_status_idx" ON "media_profiles"("profession", "status");

-- CreateIndex
CREATE INDEX "media_profiles_division_district_status_idx" ON "media_profiles"("division", "district", "status");

-- CreateIndex
CREATE INDEX "listings_status_createdAt_idx" ON "listings"("status", "createdAt");

-- CreateIndex
CREATE INDEX "listings_sellerId_idx" ON "listings"("sellerId");

-- CreateIndex
CREATE INDEX "listings_category_status_createdAt_idx" ON "listings"("category", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_posts" ADD CONSTRAINT "page_posts_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_posts" ADD CONSTRAINT "page_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_presence" ADD CONSTRAINT "user_presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_profiles" ADD CONSTRAINT "media_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

