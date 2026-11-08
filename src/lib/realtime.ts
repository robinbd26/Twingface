export type RealtimeMessage = {
  id: string;
  content: string;
  attachments: string[];
  isRead: boolean;
  createdAt: Date | string;
  senderId: string;
  sender?: { id: string; name: string; username: string; profileImage: string | null } | null;
};

export type RealtimeNotification = {
  id: string;
  type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPT' | 'MESSAGE';
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
  actor: { id: string; name: string; username: string; profileImage: string | null };
};

export type CallPeer = { id: string; name: string; username: string; profileImage: string | null };
export type CallMediaType = 'audio' | 'video';

// WebRTC signalling events relayed between two peers. The SDP/ICE payloads are
// plain JSON produced by the browser (RTCSessionDescriptionInit / the result of
// RTCIceCandidate.toJSON()); the media itself never touches the server.
export type CallSignalEvent =
  | { type: 'call-offer'; callId: string; mediaType: CallMediaType; from: CallPeer; sdp: RTCSessionDescriptionInit }
  | { type: 'call-offer-restart'; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'call-answer'; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'call-ice'; callId: string; candidate: RTCIceCandidateInit | null }
  | { type: 'call-reject'; callId: string }
  | { type: 'call-end'; callId: string };

export type RealtimeEvent =
  | { type: 'message'; message: RealtimeMessage }
  | { type: 'presence'; userId: string; isOnline: boolean; lastActiveAt: string }
  | { type: 'notification'; notification: RealtimeNotification }
  | CallSignalEvent;

type Listener = (event: RealtimeEvent) => void;

// In-process fan-out. Works for self-hosted single-instance deployments
// (next start / next dev run one Node process, so this module state is shared
// across route handlers). A multi-instance / serverless deployment should back
// this with Redis pub-sub or another shared transport.
const channels = new Map<string, Set<Listener>>();

export function subscribe(userId: string, listener: Listener): () => void {
  const listeners = channels.get(userId) ?? new Set<Listener>();
  listeners.add(listener);
  channels.set(userId, listeners);
  return () => {
    const set = channels.get(userId);
    if (!set) return;
    set.delete(listener);
    if (!set.size) channels.delete(userId);
  };
}

export function publish(userId: string, event: RealtimeEvent): void {
  const listeners = channels.get(userId);
  if (!listeners) return;
  for (const listener of [...listeners]) {
    try { listener(event); } catch { /* a broken listener must not break the others */ }
  }
}

// Deliver a freshly created message to both participants (recipient's live tab
// and the sender's other open windows).
export function publishMessage(message: RealtimeMessage, recipientId: string): void {
  publish(recipientId, { type: 'message', message });
  publish(message.senderId, { type: 'message', message });
}

// Push a notification to the recipient's live tab. Notifications are a
// recipient-side concern (badge + sound); the actor's own copy of the
// underlying event (e.g. the message) is delivered separately.
export function publishNotification(notification: RealtimeNotification, recipientId: string): void {
  publish(recipientId, { type: 'notification', notification });
}

// Deliver a call signalling event to a single peer's live tab. WebRTC
// signalling is a point-to-point relay: the server only forwards SDP/ICE
// payloads to the intended recipient, never to the sender's own channel.
export function publishCallSignal(targetUserId: string, event: CallSignalEvent): void {
  publish(targetUserId, event);
}

// Test helper: drop every registered listener between cases.
export function __resetRealtime(): void {
  channels.clear();
}
