import { getCurrentUser } from '@/lib/auth';
import { subscribe } from '@/lib/realtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const KEEP_ALIVE_MS = 25_000;

// Server-Sent Events stream delivering live notifications to the signed-in
// user, mirroring the messages stream so the bell badge and sound update the
// instant a notification is created (no dependency, works with Turbopack).
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
        if (event.type !== 'notification') return;
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
