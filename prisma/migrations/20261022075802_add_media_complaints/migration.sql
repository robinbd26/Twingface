-- CreateEnum
CREATE TYPE "MediaComplaintStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "media_complaints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" VARCHAR(120) NOT NULL,
    "details" VARCHAR(2000) NOT NULL,
    "contact" VARCHAR(120),
    "status" "MediaComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_complaints_userId_createdAt_idx" ON "media_complaints"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "media_complaints_status_createdAt_idx" ON "media_complaints"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "media_complaints" ADD CONSTRAINT "media_complaints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
