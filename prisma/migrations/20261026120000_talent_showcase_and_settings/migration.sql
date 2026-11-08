-- Talent profile showcase, rate card, privacy settings and Media World direct messaging.
CREATE TYPE "ShowcaseKind" AS ENUM ('PHOTO', 'VIDEO');

ALTER TABLE "direct_conversations" ADD COLUMN "mediaWorldMessagingEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "talent_profile_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whatsapp" VARCHAR(20),
    "youtubeUrl" VARCHAR(300),
    "facebookUrl" VARCHAR(300),
    "instagramUrl" VARCHAR(300),
    "tiktokUrl" VARCHAR(300),
    "websiteUrl" VARCHAR(300),
    "ratePerDay" INTEGER,
    "ratePerWeek" INTEGER,
    "ratePerMonth" INTEGER,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BDT',
    "showPhone" BOOLEAN NOT NULL DEFAULT false,
    "showEmail" BOOLEAN NOT NULL DEFAULT false,
    "showAddress" BOOLEAN NOT NULL DEFAULT false,
    "showWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "showRates" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talent_profile_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "talent_showcase_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ShowcaseKind" NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "publicId" VARCHAR(255),
    "title" VARCHAR(120),
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talent_showcase_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "talent_profile_settings_userId_key" ON "talent_profile_settings"("userId");
CREATE INDEX "talent_showcase_items_userId_kind_position_idx" ON "talent_showcase_items"("userId", "kind", "position");

ALTER TABLE "talent_profile_settings" ADD CONSTRAINT "talent_profile_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "talent_showcase_items" ADD CONSTRAINT "talent_showcase_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
