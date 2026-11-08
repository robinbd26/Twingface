-- CreateEnum
CREATE TYPE "MediaComplaintPersonType" AS ENUM ('ACTOR', 'ACTRESS', 'CAMERAMAN', 'DIRECTOR', 'MODEL', 'CREW', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaComplaintAttachmentKind" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "media_complaints" ADD COLUMN     "personType" "MediaComplaintPersonType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "personName" VARCHAR(120);

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

-- CreateIndex
CREATE INDEX "media_complaint_attachments_complaintId_idx" ON "media_complaint_attachments"("complaintId");

-- CreateIndex
CREATE UNIQUE INDEX "media_complaint_attachments_complaintId_position_key" ON "media_complaint_attachments"("complaintId", "position");

-- AddForeignKey
ALTER TABLE "media_complaint_attachments" ADD CONSTRAINT "media_complaint_attachments_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "media_complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;