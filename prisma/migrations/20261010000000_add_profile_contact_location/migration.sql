-- Add phone + profile fields for the full registration form.
-- Email becomes optional (either email or Bangladeshi mobile is required).

ALTER TABLE "users" ADD COLUMN "phone" VARCHAR(20);
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "gender" VARCHAR(10);
ALTER TABLE "users" ADD COLUMN "dateOfBirth" DATE;
ALTER TABLE "users" ADD COLUMN "division" VARCHAR(30);
ALTER TABLE "users" ADD COLUMN "district" VARCHAR(30);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_division_idx" ON "users"("division");

-- CreateIndex
CREATE INDEX "users_district_idx" ON "users"("district");
