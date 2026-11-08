-- Add a controlled public feeling/activity key to a post.
ALTER TABLE "posts"
  ADD COLUMN "feelingActivity" VARCHAR(64);
