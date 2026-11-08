-- CreateEnum
CREATE TYPE "MediaAccountType" AS ENUM ('PROFESSIONAL', 'BUSINESS', 'RENTAL');

-- CreateEnum
CREATE TYPE "MediaComplaintStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "MediaComplaintPersonType" AS ENUM ('ACTOR', 'ACTRESS', 'CAMERAMAN', 'DIRECTOR', 'MODEL', 'CREW', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaComplaintAttachmentKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "RentalAvailability" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'TEMPORARILY_UNAVAILABLE');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('PENDING', 'REPLIED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- DropForeignKey
ALTER TABLE "AdminSession" DROP CONSTRAINT "AdminSession_adminId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_listingId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- DropForeignKey
ALTER TABLE "Inquiry" DROP CONSTRAINT "Inquiry_listingId_fkey";

-- DropForeignKey
ALTER TABLE "Inquiry" DROP CONSTRAINT "Inquiry_userId_fkey";

-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_userId_fkey";

-- DropForeignKey
ALTER TABLE "RentalCategory" DROP CONSTRAINT "RentalCategory_parentId_fkey";

-- DropForeignKey
ALTER TABLE "RentalListing" DROP CONSTRAINT "RentalListing_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "RentalListing" DROP CONSTRAINT "RentalListing_providerId_fkey";

-- DropForeignKey
ALTER TABLE "RentalListing" DROP CONSTRAINT "RentalListing_subcategoryId_fkey";

-- DropForeignKey
ALTER TABLE "RentalListingPhoto" DROP CONSTRAINT "RentalListingPhoto_listingId_fkey";

-- DropForeignKey
ALTER TABLE "RentalProvider" DROP CONSTRAINT "RentalProvider_userId_fkey";

-- DropForeignKey
ALTER TABLE "RentalSubcategory" DROP CONSTRAINT "RentalSubcategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "UserIdentity" DROP CONSTRAINT "UserIdentity_userId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accountType" "MediaAccountType";

-- DropTable
DROP TABLE "AdminSession";

-- DropTable
DROP TABLE "AdminUser";

-- DropTable
DROP TABLE "Booking";

-- DropTable
DROP TABLE "Inquiry";

-- DropTable
DROP TABLE "Organization";

-- DropTable
DROP TABLE "RentalCategory";

-- DropTable
DROP TABLE "RentalListing";

-- DropTable
DROP TABLE "RentalListingPhoto";

-- DropTable
DROP TABLE "RentalProvider";

-- DropTable
DROP TABLE "RentalSubcategory";

-- DropTable
DROP TABLE "UserIdentity";

-- DropEnum
DROP TYPE "AccountType";

-- DropEnum
DROP TYPE "Designation";

-- DropEnum
DROP TYPE "Industry";

-- DropEnum
DROP TYPE "MainCategory";

-- DropEnum
DROP TYPE "PriceUnit";

-- CreateEnum
CREATE TYPE "PriceUnit" AS ENUM ('PER_HOUR', 'PER_DAY', 'PER_WEEK', 'PER_MONTH', 'CUSTOM');

-- CreateTable
CREATE TABLE "media_complaints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" VARCHAR(120) NOT NULL,
    "details" VARCHAR(2000) NOT NULL,
    "contact" VARCHAR(120),
    "status" "MediaComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "personType" "MediaComplaintPersonType" NOT NULL DEFAULT 'OTHER',
    "personName" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_complaint_attachments" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "publicId" VARCHAR(255) NOT NULL,
    "kind" "MediaComplaintAttachmentKind" NOT NULL DEFAULT 'IMAGE',
    "mimeType" VARCHAR(60) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "media_complaint_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industries" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "nameEn" VARCHAR(80) NOT NULL,
    "nameBn" VARCHAR(80) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main_categories" (
    "id" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "nameEn" VARCHAR(100) NOT NULL,
    "nameBn" VARCHAR(100) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "main_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designations" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "nameEn" VARCHAR(120) NOT NULL,
    "nameBn" VARCHAR(120) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designation_categories" (
    "designationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "designation_categories_pkey" PRIMARY KEY ("designationId","categoryId")
);

-- CreateTable
CREATE TABLE "user_professional_identities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "mainCategoryId" TEXT NOT NULL,
    "designationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_professional_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_types" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "nameEn" VARCHAR(120) NOT NULL,
    "nameBn" VARCHAR(120) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgTypeId" TEXT NOT NULL,
    "orgName" VARCHAR(160) NOT NULL,
    "contactName" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "address" VARCHAR(300),
    "city" VARCHAR(120),
    "description" VARCHAR(2000),
    "website" VARCHAR(500),
    "logoUrl" VARCHAR(500),
    "logoPublicId" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_providers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ownerName" VARCHAR(100) NOT NULL,
    "businessName" VARCHAR(160),
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "location" VARCHAR(160) NOT NULL,
    "fullAddress" VARCHAR(300),
    "logoUrl" VARCHAR(500),
    "logoPublicId" VARCHAR(255),
    "description" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_categories" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "nameEn" VARCHAR(100) NOT NULL,
    "nameBn" VARCHAR(100) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_subcategories" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "nameEn" VARCHAR(120) NOT NULL,
    "nameBn" VARCHAR(120) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_listings" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subcategoryId" TEXT,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(3000) NOT NULL,
    "pricePaisa" INTEGER NOT NULL,
    "priceUnit" "PriceUnit" NOT NULL,
    "priceCustom" VARCHAR(80),
    "location" VARCHAR(160) NOT NULL,
    "division" VARCHAR(30),
    "district" VARCHAR(30),
    "availability" "RentalAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contactPhone" VARCHAR(20),
    "contactEmail" VARCHAR(255),
    "terms" VARCHAR(2000),
    "vehicleType" VARCHAR(60),
    "seatingCapacity" INTEGER,
    "driverIncluded" BOOLEAN,
    "roomCount" INTEGER,
    "facilities" VARCHAR(500),
    "parkingAvailable" BOOLEAN,
    "availableHours" VARCHAR(200),
    "brandModel" VARCHAR(160),
    "quantity" INTEGER,
    "condition" VARCHAR(60),
    "accessories" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_listing_photos" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "publicId" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rental_listing_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "message" VARCHAR(2000) NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_listing_reports" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" VARCHAR(120) NOT NULL,
    "details" VARCHAR(1000),
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_listing_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_complaints_userId_createdAt_idx" ON "media_complaints"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "media_complaints_status_createdAt_idx" ON "media_complaints"("status", "createdAt");

-- CreateIndex
CREATE INDEX "media_complaint_attachments_complaintId_idx" ON "media_complaint_attachments"("complaintId");

-- CreateIndex
CREATE UNIQUE INDEX "media_complaint_attachments_complaintId_position_key" ON "media_complaint_attachments"("complaintId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "industries_code_key" ON "industries"("code");

-- CreateIndex
CREATE INDEX "main_categories_industryId_sortOrder_idx" ON "main_categories"("industryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "main_categories_industryId_code_key" ON "main_categories"("industryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "designations_code_key" ON "designations"("code");

-- CreateIndex
CREATE INDEX "designation_categories_categoryId_idx" ON "designation_categories"("categoryId");

-- CreateIndex
CREATE INDEX "user_professional_identities_industryId_mainCategoryId_idx" ON "user_professional_identities"("industryId", "mainCategoryId");

-- CreateIndex
CREATE INDEX "user_professional_identities_designationId_idx" ON "user_professional_identities"("designationId");

-- CreateIndex
CREATE UNIQUE INDEX "user_professional_identities_userId_industryId_mainCategory_key" ON "user_professional_identities"("userId", "industryId", "mainCategoryId", "designationId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_types_code_key" ON "organization_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_userId_key" ON "organizations"("userId");

-- CreateIndex
CREATE INDEX "organizations_orgTypeId_idx" ON "organizations"("orgTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "rental_providers_userId_key" ON "rental_providers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "rental_categories_code_key" ON "rental_categories"("code");

-- CreateIndex
CREATE INDEX "rental_subcategories_categoryId_sortOrder_idx" ON "rental_subcategories"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "rental_subcategories_categoryId_code_key" ON "rental_subcategories"("categoryId", "code");

-- CreateIndex
CREATE INDEX "rental_listings_providerId_updatedAt_idx" ON "rental_listings"("providerId", "updatedAt");

-- CreateIndex
CREATE INDEX "rental_listings_categoryId_availability_createdAt_idx" ON "rental_listings"("categoryId", "availability", "createdAt");

-- CreateIndex
CREATE INDEX "rental_listings_subcategoryId_availability_idx" ON "rental_listings"("subcategoryId", "availability");

-- CreateIndex
CREATE INDEX "rental_listings_isActive_createdAt_idx" ON "rental_listings"("isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "rental_listing_photos_listingId_position_key" ON "rental_listing_photos"("listingId", "position");

-- CreateIndex
CREATE INDEX "inquiries_listingId_createdAt_idx" ON "inquiries"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "inquiries_userId_createdAt_idx" ON "inquiries"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "rental_listing_reports_listingId_idx" ON "rental_listing_reports"("listingId");

-- CreateIndex
CREATE INDEX "rental_listing_reports_status_createdAt_idx" ON "rental_listing_reports"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "media_complaints" ADD CONSTRAINT "media_complaints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_complaint_attachments" ADD CONSTRAINT "media_complaint_attachments_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "media_complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_categories" ADD CONSTRAINT "main_categories_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designation_categories" ADD CONSTRAINT "designation_categories_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "designations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designation_categories" ADD CONSTRAINT "designation_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "main_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_professional_identities" ADD CONSTRAINT "user_professional_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_professional_identities" ADD CONSTRAINT "user_professional_identities_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_professional_identities" ADD CONSTRAINT "user_professional_identities_mainCategoryId_fkey" FOREIGN KEY ("mainCategoryId") REFERENCES "main_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_professional_identities" ADD CONSTRAINT "user_professional_identities_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_orgTypeId_fkey" FOREIGN KEY ("orgTypeId") REFERENCES "organization_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_providers" ADD CONSTRAINT "rental_providers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_subcategories" ADD CONSTRAINT "rental_subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "rental_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_listings" ADD CONSTRAINT "rental_listings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "rental_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_listings" ADD CONSTRAINT "rental_listings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "rental_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_listings" ADD CONSTRAINT "rental_listings_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "rental_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_listing_photos" ADD CONSTRAINT "rental_listing_photos_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "rental_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "rental_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_listing_reports" ADD CONSTRAINT "rental_listing_reports_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "rental_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_listing_reports" ADD CONSTRAINT "rental_listing_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

