'use client';

import { useEffect } from 'react';

const HEARTBEAT_INTERVAL_MS = 45 * 1000; // comfortably inside the 60s server-side online window

// Marks the current user online while the tab is open, and flips them offline on hide/close.
// `enabled` is false for a visitor: the endpoint requires a session, so beating anyway would
// put a 401 in the console of every public page, every 45 seconds, for as long as the tab lives.
export default function PresenceHeartbeat({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function beat(isOnline: boolean) {
      try {
        await fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isOnline }),
          keepalive: isOnline === false,
        });
      } catch {
        // Presence is best-effort; ignore transient network failures.
      }
    }

    function goOnline() { if (!cancelled) void beat(true); }
    function goOffline() { void beat(false); }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') goOffline();
      else goOnline();
    }

    goOnline();
    const timer = window.setInterval(goOnline, HEARTBEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', goOffline);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', goOffline);
    };
  }, [enabled]);

  return null;
}
