-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "profileImage" VARCHAR(500),
    "coverImage" VARCHAR(500),
    "bio" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");
