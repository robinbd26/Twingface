-- Add Cloudinary delivery and internal cleanup metadata for a single post image.
ALTER TABLE "posts"
  ADD COLUMN "imageUrl" VARCHAR(500),
  ADD COLUMN "imagePublicId" VARCHAR(255);
