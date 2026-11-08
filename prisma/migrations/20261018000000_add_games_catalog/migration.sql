-- CreateEnum
CREATE TYPE "GameGenre" AS ENUM ('ACTION', 'HORROR', 'RACING', 'PUZZLE_STRATEGY', 'SPORTS_FIGHTING', 'ARCADE', 'RPG');

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "genre" "GameGenre" NOT NULL,
    "thumbnailUrl" VARCHAR(500) NOT NULL,
    "playUrl" VARCHAR(500) NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");
CREATE INDEX "games_isActive_isFeatured_createdAt_idx" ON "games"("isActive", "isFeatured", "createdAt");
CREATE INDEX "games_genre_isActive_createdAt_idx" ON "games"("genre", "isActive", "createdAt");
ALTER TABLE "games" ADD CONSTRAINT "games_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
