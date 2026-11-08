import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { safeFriendUserSelect } from './relationship';

export const DEFAULT_MESSAGES_PER_PAGE = 30;
export const MAX_MESSAGES_PER_PAGE = 50;
export const DEFAULT_CONVERSATIONS_PER_PAGE = 30;
export const MAX_CONVERSATIONS_PER_PAGE = 50;

export const CreateDirectMessageSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  attachments: z.array(z.string().url().max(500)).max(10).optional(),
}).strict();

// Spec endpoint shape: POST /api/messages/send { receiver_id, message_text, attachments }.
export const SendMessageSchema = z.object({
  receiverId: z.string().trim().min(1).max(40),
  messageText: z.string().trim().min(1).max(1000),
  attachments: z.array(z.string().url().max(500)).max(10).optional(),
}).strict();

export const safeDirectMessageSelect = {
  id: true,
  content: true,
  attachments: true,
  isRead: true,
  createdAt: true,
  updatedAt: true,
  senderId: true,
  sender: { select: safeFriendUserSelect },
  marketplaceListing: {
    select: {
      id: true,
      title: true,
      status: true,
      images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
    },
  },
} satisfies Prisma.DirectMessageSelect;

export const marketplaceConversationAccessSelect = {
  id: true,
  pairKey: true,
  participantOneId: true,
  participantTwoId: true,
  marketplaceMessagingEnabled: true,
  mediaWorldMessagingEnabled: true,
} satisfies Prisma.DirectConversationSelect;

export const safeConversationSelect = {
  id: true,
  participantOneId: true,
  participantTwoId: true,
  lastMessageAt: true,
  createdAt: true,
  updatedAt: true,
  participantOne: { select: safeFriendUserSelect },
  participantTwo: { select: safeFriendUserSelect },
  messages: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { id: true, content: true, createdAt: true, senderId: true },
  },
} satisfies Prisma.DirectConversationSelect;

export function safeInboxConversationSelect(viewerId: string) {
  return {
    ...safeConversationSelect,
    _count: {
      select: {
        messages: { where: { senderId: { not: viewerId }, isRead: false } },
      },
    },
  } satisfies Prisma.DirectConversationSelect;
}

export async function canUseDirectConversation(
  input: { viewerId: string; otherUserId: string; pairKey: string },
  client: Pick<Prisma.TransactionClient, 'friendship' | 'directConversation'>,
): Promise<boolean> {
  const friendship = await client.friendship.findUnique({ where: { pairKey: input.pairKey }, select: { status: true } });
  if (friendship?.status === 'ACCEPTED') return true;
  const conversation = await client.directConversation.findUnique({
    where: { pairKey: input.pairKey },
    select: marketplaceConversationAccessSelect,
  });
  if (!conversation) return false;
  const samePair = [conversation.participantOneId, conversation.participantTwoId].sort().join(':')
    === [input.viewerId, input.otherUserId].sort().join(':');
  if (!samePair) return false;
  // Marketplace inquiries and Media World profile contacts are the two
  // conversation-level exceptions to the friendship requirement.
  return Boolean(conversation.marketplaceMessagingEnabled || conversation.mediaWorldMessagingEnabled);
}

export function parseMessageLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_MESSAGES_PER_PAGE;
  return Math.min(parsed, MAX_MESSAGES_PER_PAGE);
}

export function parseConversationLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_CONVERSATIONS_PER_PAGE;
  return Math.min(parsed, MAX_CONVERSATIONS_PER_PAGE);
}
