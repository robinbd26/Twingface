import { afterEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
  setItem: (key: string, value: string) => { store.set(key, value); },
  clear: () => store.clear(),
};

function installWindow() {
  (globalThis as unknown as { window: unknown }).window = { localStorage: localStorageStub };
}

describe('message sound preference', () => {
  afterEach(() => {
    store.clear();
    delete (globalThis as unknown as { window?: unknown }).window;
    vi.resetModules();
  });

  it('persists message sound separately from the notification sound preference', async () => {
    installWindow();
    const mod = await import('./message-sound');

    expect(mod.readMessageSoundPreference()).toEqual({ enabled: true, hydrated: true });
    mod.writeMessageSoundPreference(false);
    expect(window.localStorage.getItem('tf-message-sound')).toBe('off');
    expect(window.localStorage.getItem('tf-notification-sound')).toBeNull();
    expect(mod.readMessageSoundPreference()).toEqual({ enabled: false, hydrated: true });
  });

  it('plays a distinct single-tone message sound when audio is available', async () => {
    installWindow();
    const oscillator = { type: '', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    const context = { state: 'running', currentTime: 0, destination: {}, resume: vi.fn(), createGain: vi.fn(() => gain), createOscillator: vi.fn(() => oscillator) };
    (globalThis as unknown as { window: { AudioContext?: unknown } }).window.AudioContext = vi.fn(() => context);

    const mod = await import('./message-sound');
    mod.playMessageSound();

    expect(context.createOscillator).toHaveBeenCalledTimes(1);
    expect(oscillator.start).toHaveBeenCalled();
  });
});
