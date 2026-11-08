import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Signed-out visitors do not fire member-only background requests', () => {
  it('asks the session once in the shared shell and hands the answer to both surfaces', () => {
    const layout = source('src/app/(main)/layout.tsx');

    expect(layout).toContain('const authenticated = Boolean(await getCurrentUser());');
    expect(layout).toContain('<CallProvider enabled={authenticated}>');
    expect(layout).toContain('<PresenceHeartbeat enabled={authenticated} />');
    expect(layout.match(/getCurrentUser\(\)/g) ?? []).toHaveLength(1);
  });

  it('never starts the presence timer for a visitor', () => {
    const heartbeat = source('src/components/presence/presence-heartbeat.tsx');

    expect(heartbeat).toContain('export default function PresenceHeartbeat({ enabled = true }: { enabled?: boolean })');
    expect(heartbeat).toContain('if (!enabled) return;');
    expect(heartbeat).toContain('}, [enabled]);');
    // The guard has to run before the first beat, not after the interval is already armed.
    expect(heartbeat.indexOf('if (!enabled) return;')).toBeLessThan(heartbeat.indexOf('goOnline();'));
  });

  it('never opens the call stream for a visitor', () => {
    const calls = source('src/components/messages/call-context.tsx');

    expect(calls).toContain('export function CallProvider({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean })');
    expect(calls).toContain('}, [cleanup, clearNoAnswerTimer, sendSignal, stopRingTone, enabled]);');
    expect(calls.indexOf('if (!enabled) return;')).toBeLessThan(calls.indexOf("new EventSource('/api/calls/stream')"));
  });
});
