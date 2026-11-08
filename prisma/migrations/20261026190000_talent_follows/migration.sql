-- CreateTable
CREATE TABLE "talent_follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "talent_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "talent_follows_followingId_idx" ON "talent_follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "talent_follows_followerId_followingId_key" ON "talent_follows"("followerId", "followingId");

-- AddForeignKey
ALTER TABLE "talent_follows" ADD CONSTRAINT "talent_follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_follows" ADD CONSTRAINT "talent_follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
