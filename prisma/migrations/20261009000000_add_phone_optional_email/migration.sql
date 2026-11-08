-- AlterTable: make email optional, add phone for Bangladeshi mobile signup
ALTER TABLE "users" ADD COLUMN "phone" VARCHAR(20);
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");
