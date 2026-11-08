-- Optional public profile-intro details. Existing users remain valid.
ALTER TABLE "users"
  ADD COLUMN "profession" VARCHAR(100),
  ADD COLUMN "education" VARCHAR(160),
  ADD COLUMN "currentCity" VARCHAR(120),
  ADD COLUMN "hometown" VARCHAR(120);
