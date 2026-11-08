import { afterEach, describe, expect, it, vi } from 'vitest';

// jsdom-free unit test: we stub just the pieces of `window` the module touches
// (localStorage + Web Audio), so no browser environment is required.
const store = new Map<string, string>();

const localStorageStub = {
  getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
  setItem: (key: string, value: string) => { store.set(key, value); },
  removeItem: (key: string) => { store.delete(key); },
  clear: () => store.clear(),
};

function installWindow() {
  (globalThis as unknown as { window: unknown }).window = { localStorage: localStorageStub };
}

describe('notification sound preference', () => {
  afterEach(() => {
    store.clear();
    delete (globalThis as unknown as { window?: unknown }).window;
    // The module caches an AudioContext at module scope; reset so each test
    // gets a fresh instance and cannot leak audio state into the next case.
    vi.resetModules();
  });

  it('defaults to enabled and reflects an explicit off', async () => {
    installWindow();
    const mod = await import('./notification-sound');
    expect(mod.readNotificationSoundPreference()).toEqual({ enabled: true, hydrated: true });

    mod.writeNotificationSoundPreference(false);
    expect(window.localStorage.getItem('tf-notification-sound')).toBe('off');
    expect(mod.readNotificationSoundPreference()).toEqual({ enabled: false, hydrated: true });

    mod.writeNotificationSoundPreference(true);
    expect(window.localStorage.getItem('tf-notification-sound')).toBe('on');
    expect(mod.readNotificationSoundPreference()).toEqual({ enabled: true, hydrated: true });
  });

  it('plays a synthesised chime through the Web Audio API', async () => {
    installWindow();
    const oscillator = { type: '', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    const context = {
      state: 'running',
      currentTime: 0,
      destination: {},
      resume: vi.fn(),
      createGain: vi.fn(() => gain),
      createOscillator: vi.fn(() => oscillator),
    };
    (globalThis as unknown as { window: { AudioContext?: unknown } }).window.AudioContext = vi.fn(() => context);

    const mod = await import('./notification-sound');
    mod.playNotificationSound();

    expect(context.createOscillator).toHaveBeenCalledTimes(2); // two-note chime
    expect(oscillator.start).toHaveBeenCalled();
    expect(oscillator.stop).toHaveBeenCalled();
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
  });

  it('silently no-ops when the Web Audio API is unavailable', async () => {
    installWindow();
    const mod = await import('./notification-sound');
    expect(() => mod.playNotificationSound()).not.toThrow();
  });
});
