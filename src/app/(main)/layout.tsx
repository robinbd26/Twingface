import { MessengerProvider } from '@/components/messages/messenger-context';
import MessengerDock from '@/components/messages/messenger-dock';
import { CallProvider } from '@/components/messages/call-context';
import CallOverlay from '@/components/messages/call-overlay';
import PresenceHeartbeat from '@/components/presence/presence-heartbeat';
import { getCurrentUser } from '@/lib/auth';

// Shared shell for every page under (main), signed-in or public. Hosting the messenger + call
// providers here (instead of per-page) guarantees exactly one signalling SSE listener and one
// incoming-call overlay no matter which route the callee is on — previously only /dashboard and
// /[username] could receive calls.
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  // /mediaworld, /for-rent/register and the wizards are reachable while signed out, and both the
  // heartbeat and the call stream require a session — so visitors get the shell without them.
  const authenticated = Boolean(await getCurrentUser());
  return (
    <MessengerProvider>
      <CallProvider enabled={authenticated}>
        <PresenceHeartbeat enabled={authenticated} />
        {children}
        <MessengerDock />
        <CallOverlay />
      </CallProvider>
    </MessengerProvider>
  );
}
