-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "friendships" (
    "id" TEXT NOT NULL,
    "pairKey" VARCHAR(64) NOT NULL,
    "requesterId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_conversations" (
    "id" TEXT NOT NULL,
    "pairKey" VARCHAR(64) NOT NULL,
    "participantOneId" TEXT NOT NULL,
    "participantTwoId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" TEXT NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "friendships_pairKey_key" ON "friendships"("pairKey");
CREATE INDEX "friendships_requesterId_status_idx" ON "friendships"("requesterId", "status");
CREATE INDEX "friendships_recipientId_status_idx" ON "friendships"("recipientId", "status");
CREATE UNIQUE INDEX "direct_conversations_pairKey_key" ON "direct_conversations"("pairKey");
CREATE INDEX "direct_conversations_participantOneId_lastMessageAt_idx" ON "direct_conversations"("participantOneId", "lastMessageAt");
CREATE INDEX "direct_conversations_participantTwoId_lastMessageAt_idx" ON "direct_conversations"("participantTwoId", "lastMessageAt");
CREATE INDEX "direct_messages_conversationId_createdAt_idx" ON "direct_messages"("conversationId", "createdAt");
CREATE INDEX "direct_messages_senderId_idx" ON "direct_messages"("senderId");

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "direct_conversations" ADD CONSTRAINT "direct_conversations_participantOneId_fkey" FOREIGN KEY ("participantOneId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "direct_conversations" ADD CONSTRAINT "direct_conversations_participantTwoId_fkey" FOREIGN KEY ("participantTwoId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "direct_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
