// Notification sound preference + player.
//
// The chime is synthesised with the Web Audio API so we ship no binary asset
// and it works offline. The on/off preference is persisted in localStorage,
// mirroring the existing `tf-theme` pattern used by the theme toggle.

export const NOTIFICATION_SOUND_STORAGE_KEY = 'tf-notification-sound';

export type NotificationSoundPreference = { enabled: boolean; hydrated: boolean };

export function readNotificationSoundPreference(): NotificationSoundPreference {
  if (typeof window === 'undefined') return { enabled: true, hydrated: false };
  try {
    const stored = window.localStorage.getItem(NOTIFICATION_SOUND_STORAGE_KEY);
    // Default to ON (Facebook plays a sound by default); only an explicit
    // "off" disables it.
    return { enabled: stored !== 'off', hydrated: true };
  } catch {
    return { enabled: true, hydrated: false };
  }
}

export function writeNotificationSoundPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NOTIFICATION_SOUND_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    /* storage may be unavailable (private mode); preference stays in-memory */
  }
}

// Lazily-created AudioContext, reused across chimes. Browsers require a user
// gesture before audio can start, so this is only ever called from event
// handlers or after the user has interacted with the page.
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) {
    try {
      audioContext = new Ctor();
    } catch {
      return null;
    }
  }
  return audioContext;
}

// Play a short, pleasant two-note "ding" (E6 -> A6). Silently no-ops if the
// Web Audio API is unavailable or playback is blocked before a user gesture.
export function playNotificationSound(): void {
  const context = getAudioContext();
  if (!context) return;
  try {
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    master.connect(context.destination);

    const notes: Array<{ frequency: number; start: number }> = [
      { frequency: 1318.51, start: now },        // E6
      { frequency: 1760.0, start: now + 0.12 },  // A6
    ];
    for (const note of notes) {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(note.frequency, note.start);
      oscillator.connect(master);
      oscillator.start(note.start);
      oscillator.stop(note.start + 0.22);
    }
  } catch {
    /* playback is best-effort; ignore */
  }
}
