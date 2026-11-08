-- Persistent comments for posts. Existing posts and users cascade safely.
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "comments_postId_createdAt_idx" ON "comments"("postId", "createdAt");
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");

ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
