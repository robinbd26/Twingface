import { getCurrentUser } from '@/lib/auth';
import { subscribe } from '@/lib/realtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const KEEP_ALIVE_MS = 25_000;

// Server-Sent Events stream delivering WebRTC signalling events to the
// signed-in user. WebRTC media flows peer-to-peer; this channel only relays
// SDP offers/answers and ICE candidates between the two call participants,
// reusing the same in-process realtime bus as direct messages.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response('Authentication is required.', { status: 401 });

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(': connected\n\n'));
      unsubscribe = subscribe(user.id, (event) => {
        // Only forward call signalling events; messages/notifications/presence
        // are delivered on their own dedicated streams.
        if (!event.type.startsWith('call-')) return;
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); } catch { /* stream closed */ }
      });
      ping = setInterval(() => {
        try { controller.enqueue(encoder.encode(': ping\n\n')); } catch { /* stream closed */ }
      }, KEEP_ALIVE_MS);
    },
    cancel() {
      if (ping) clearInterval(ping);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
