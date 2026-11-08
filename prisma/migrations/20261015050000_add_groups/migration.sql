-- Facebook-style groups, membership approval, and isolated group posts.
CREATE TYPE "GroupPrivacy" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "GroupPostingPolicy" AS ENUM ('MEMBERS', 'ADMINS_ONLY');
CREATE TYPE "GroupRole" AS ENUM ('ADMIN', 'MODERATOR', 'MEMBER');
CREATE TYPE "GroupMembershipStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "handle" VARCHAR(60) NOT NULL,
    "description" VARCHAR(500),
    "privacy" "GroupPrivacy" NOT NULL,
    "postingPolicy" "GroupPostingPolicy" NOT NULL,
    "coverImage" VARCHAR(500),
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "group_memberships" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "status" "GroupMembershipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "group_posts" (
    "id" TEXT NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "imageUrl" VARCHAR(500),
    "imagePublicId" VARCHAR(255),
    "feelingActivity" VARCHAR(64),
    "youtubeUrl" VARCHAR(255),
    "groupId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_posts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "groups_handle_key" ON "groups"("handle");
CREATE INDEX "groups_creatorId_idx" ON "groups"("creatorId");
CREATE INDEX "groups_privacy_createdAt_idx" ON "groups"("privacy", "createdAt");
CREATE UNIQUE INDEX "group_memberships_groupId_userId_key" ON "group_memberships"("groupId", "userId");
CREATE INDEX "group_memberships_groupId_status_createdAt_idx" ON "group_memberships"("groupId", "status", "createdAt");
CREATE INDEX "group_memberships_userId_status_createdAt_idx" ON "group_memberships"("userId", "status", "createdAt");
CREATE INDEX "group_posts_groupId_createdAt_idx" ON "group_posts"("groupId", "createdAt");
CREATE INDEX "group_posts_authorId_idx" ON "group_posts"("authorId");

ALTER TABLE "groups" ADD CONSTRAINT "groups_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_posts" ADD CONSTRAINT "group_posts_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_posts" ADD CONSTRAINT "group_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
