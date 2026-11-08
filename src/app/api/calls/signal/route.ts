import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CallSignalSchema } from '@/lib/call';
import { makePairKey } from '@/lib/relationship';
import { publishCallSignal } from '@/lib/realtime';

// Relay a WebRTC signalling message to its recipient. The sender is derived
// from the authenticated session (never the request body), and — like direct
// messaging — calling is restricted to accepted friends. The server never sees
// or stores the media itself, only the SDP/ICE handshake payloads.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });

  const input = CallSignalSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Invalid call signal.', fields: input.error.flatten().fieldErrors }, { status: 400 });
  const signal = input.data;

  if (signal.toUserId === user.id) return NextResponse.json({ error: 'You cannot call yourself.' }, { status: 400 });

  const receiver = await prisma.user.findUnique({ where: { id: signal.toUserId }, select: { id: true } });
  if (!receiver) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const pairKey = makePairKey(user.id, signal.toUserId);
  const friendship = await prisma.friendship.findUnique({ where: { pairKey }, select: { status: true } });
  if (friendship?.status !== 'ACCEPTED') {
    return NextResponse.json({ error: 'Calling is available after both users become friends.' }, { status: 403 });
  }

  const from = { id: user.id, name: user.name, username: user.username, profileImage: user.profileImage };

  switch (signal.kind) {
    case 'offer':
      publishCallSignal(signal.toUserId, { type: 'call-offer', callId: signal.callId, mediaType: signal.mediaType, from, sdp: signal.sdp as RTCSessionDescriptionInit });
      break;
    case 'offer-restart':
      publishCallSignal(signal.toUserId, { type: 'call-offer-restart', callId: signal.callId, sdp: signal.sdp as RTCSessionDescriptionInit });
      break;
    case 'answer':
      publishCallSignal(signal.toUserId, { type: 'call-answer', callId: signal.callId, sdp: signal.sdp as RTCSessionDescriptionInit });
      break;
    case 'ice':
      publishCallSignal(signal.toUserId, { type: 'call-ice', callId: signal.callId, candidate: signal.candidate });
      break;
    case 'reject':
      publishCallSignal(signal.toUserId, { type: 'call-reject', callId: signal.callId });
      break;
    case 'end':
      publishCallSignal(signal.toUserId, { type: 'call-end', callId: signal.callId });
      break;
  }

  return NextResponse.json({ ok: true });
}
