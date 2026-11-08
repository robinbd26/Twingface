export const MESSAGE_SOUND_STORAGE_KEY = 'tf-message-sound';

export type MessageSoundPreference = { enabled: boolean; hydrated: boolean };

export function readMessageSoundPreference(): MessageSoundPreference {
  if (typeof window === 'undefined') return { enabled: true, hydrated: false };
  try {
    return { enabled: window.localStorage.getItem(MESSAGE_SOUND_STORAGE_KEY) !== 'off', hydrated: true };
  } catch {
    return { enabled: true, hydrated: false };
  }
}

export function writeMessageSoundPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MESSAGE_SOUND_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    /* storage may be unavailable */
  }
}

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

// A soft, single lower-pitched tone, intentionally distinct from the
// two-note notification bell chime.
export function playMessageSound(): void {
  const context = getAudioContext();
  if (!context) return;
  try {
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.13, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    gain.connect(context.destination);
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(783.99, now); // G5
    oscillator.connect(gain);
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  } catch {
    /* audio playback is best-effort */
  }
}
