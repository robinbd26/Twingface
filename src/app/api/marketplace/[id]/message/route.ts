import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { safeDirectMessageSelect } from '@/lib/message';
import { makePairKey } from '@/lib/relationship';
import { publishMessage } from '@/lib/realtime';

type Context = { params: Promise<{ id: string }> };
const InquirySchema = z.object({ content: z.string().trim().min(1).max(1000) }).strict();

export async function POST(request: Request, { params }: Context) {
  const buyer = await getCurrentUser();
  if (!buyer) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { id } = await params;
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id },
    select: { id: true, sellerId: true, status: true },
  });
  if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  if (listing.sellerId === buyer.id) return NextResponse.json({ error: 'You cannot message yourself.' }, { status: 400 });
  if (listing.status !== 'AVAILABLE') return NextResponse.json({ error: 'This listing is no longer available.' }, { status: 400 });
  const input = InquirySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Please correct the highlighted fields.', fields: input.error.flatten().fieldErrors }, { status: 400 });

  const pairKey = makePairKey(buyer.id, listing.sellerId);
  const [participantOneId, participantTwoId] = [buyer.id, listing.sellerId].sort();
  const result = await prisma.$transaction(async (transaction) => {
    const conversation = await transaction.directConversation.upsert({
      where: { pairKey },
      create: { pairKey, participantOneId, participantTwoId, marketplaceMessagingEnabled: true },
      update: { marketplaceMessagingEnabled: true },
      select: { id: true },
    });
    const message = await transaction.directMessage.create({
      data: { conversationId: conversation.id, senderId: buyer.id, content: input.data.content, attachments: [], marketplaceListingId: listing.id },
      select: safeDirectMessageSelect,
    });
    await transaction.directConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: message.createdAt } });
    return { conversation, message };
  });
  publishMessage(result.message, listing.sellerId);
  return NextResponse.json({
    conversation: result.conversation,
    message: {
      id: result.message.id,
      content: result.message.content,
      attachments: result.message.attachments,
      isRead: result.message.isRead,
      createdAt: result.message.createdAt,
      senderId: result.message.senderId,
      sender: result.message.sender ? {
        id: result.message.sender.id,
        name: result.message.sender.name,
        username: result.message.sender.username,
        profileImage: result.message.sender.profileImage,
      } : null,
      marketplaceListing: result.message.marketplaceListing ? {
        id: result.message.marketplaceListing.id,
        title: result.message.marketplaceListing.title,
        status: result.message.marketplaceListing.status,
        images: result.message.marketplaceListing.images.map((image) => ({ url: image.url })),
      } : null,
    },
  }, { status: 201 });
}
