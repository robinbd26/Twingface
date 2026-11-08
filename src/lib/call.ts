import { z } from 'zod';
import type { CallMediaType } from './realtime';

// A call id is a client-generated opaque token (crypto.randomUUID). It is only
// ever used to correlate signalling messages between the two peers; the server
// never persists it.
const callId = z.string().trim().min(8).max(64);

// SDP and ICE payloads are opaque blobs forwarded verbatim to the peer. We
// bound their size to avoid abuse but never parse their contents here.
const sdp = z
  .object({ type: z.string().min(1).max(32), sdp: z.string().max(200_000) })
  .passthrough();

const iceCandidate = z
  .object({
    candidate: z.string().max(20_000).optional(),
    sdpMid: z.string().max(256).nullable().optional(),
    sdpMLineIndex: z.number().int().nullable().optional(),
    usernameFragment: z.string().max(256).nullable().optional(),
  })
  .passthrough()
  .nullable();

// Every signal names its intended recipient; the server authenticates the
// sender from the session and never trusts a client-supplied sender identity.
export const CallSignalSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('offer'),
    toUserId: z.string().trim().min(1).max(40),
    callId,
    mediaType: z.enum(['audio', 'video']) as z.ZodType<CallMediaType>,
    sdp,
  }),
  // A mid-call re-offer carrying fresh ICE credentials after restartIce().
  // Carries no mediaType (the callee already knows it) and is applied as a
  // remote offer exactly like the initial one.
  z.object({ kind: z.literal('offer-restart'), toUserId: z.string().trim().min(1).max(40), callId, sdp }),
  z.object({ kind: z.literal('answer'), toUserId: z.string().trim().min(1).max(40), callId, sdp }),
  z.object({ kind: z.literal('ice'), toUserId: z.string().trim().min(1).max(40), callId, candidate: iceCandidate }),
  z.object({ kind: z.literal('reject'), toUserId: z.string().trim().min(1).max(40), callId }),
  z.object({ kind: z.literal('end'), toUserId: z.string().trim().min(1).max(40), callId }),
]);

export type ParsedCallSignal = z.infer<typeof CallSignalSchema>;
