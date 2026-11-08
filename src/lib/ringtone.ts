// Ringback tone for outgoing calls and a ringtone for incoming calls, both
// synthesised with the Web Audio API so we ship no binary asset and it works
// offline. Playback must start from a user gesture (the caller presses the
// call button; the callee presses "Answer"), which the UI guarantees.

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) {
    try { audioContext = new Ctor(); } catch { return null; }
  }
  return audioContext;
}

type ToneHandle = { stop: () => void };

export type { ToneHandle };

// Play a single short tone burst at the given frequency.
function burst(context: AudioContext, frequency: number, start: number, duration: number, gain: number): void {
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, start);
  master.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  master.connect(context.destination);
  const oscillator = context.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.connect(master);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

// A repeating two-pulse ring (classic North-American ringback). Returns a
// handle whose stop() ends it immediately.
export function startRinging(): ToneHandle {
  const context = getAudioContext();
  if (!context) return { stop: () => {} };
  try { if (context.state === 'suspended') void context.resume(); } catch { /* ignore */ }

  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const ring = () => {
    if (stopped) return;
    const now = context.currentTime;
    // Two 0.4s pulses 0.2s apart, mimicking a phone ring cadence.
    burst(context, 440, now, 0.4, 0.12);
    burst(context, 480, now + 0.5, 0.4, 0.12);
  };

  ring();
  timer = setInterval(ring, 2000);

  return {
    stop() {
      stopped = true;
      if (timer) clearInterval(timer);
    },
  };
}
