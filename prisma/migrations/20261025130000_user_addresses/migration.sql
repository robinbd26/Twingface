-- Add the two address lines collected by the Media World profile setup wizard.
ALTER TABLE "users" ADD COLUMN "presentAddress" VARCHAR(255),
ADD COLUMN "permanentAddress" VARCHAR(255);
