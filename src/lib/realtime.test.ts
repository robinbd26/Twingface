import { afterEach, describe, expect, it, vi } from 'vitest';
import { publish, publishCallSignal, publishMessage, publishNotification, subscribe, __resetRealtime } from './realtime';

const message = {
  id: 'msg-1',
  content: 'hello',
  attachments: [],
  isRead: false,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  senderId: 'user-a',
  sender: { id: 'user-a', name: 'A', username: 'alice', profileImage: null },
};

describe('realtime bus', () => {
  afterEach(() => __resetRealtime());

  it('delivers events to subscribers on the target channel only', () => {
    const onAlice = vi.fn();
    const onBob = vi.fn();
    subscribe('user-a', onAlice);
    subscribe('user-b', onBob);
    publish('user-a', { type: 'message', message });
    expect(onAlice).toHaveBeenCalledTimes(1);
    expect(onAlice).toHaveBeenCalledWith({ type: 'message', message });
    expect(onBob).not.toHaveBeenCalled();
  });

  it('stops delivering after unsubscribe', () => {
    const listener = vi.fn();
    const off = subscribe('user-a', listener);
    publish('user-a', { type: 'message', message });
    off();
    publish('user-a', { type: 'message', message });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('publishMessage reaches both participants', () => {
    const onRecipient = vi.fn();
    const onSender = vi.fn();
    subscribe('user-b', onRecipient);
    subscribe('user-a', onSender);
    publishMessage(message, 'user-b');
    expect(onRecipient).toHaveBeenCalledTimes(1);
    expect(onSender).toHaveBeenCalledTimes(1);
    expect(onRecipient.mock.calls[0][0]).toMatchObject({ type: 'message', message });
  });

  it('isolates a throwing listener from the others', () => {
    const good = vi.fn();
    subscribe('user-a', () => { throw new Error('boom'); });
    subscribe('user-a', good);
    expect(() => publish('user-a', { type: 'message', message })).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
  });

  it('supports multiple listeners on one channel', () => {
    const first = vi.fn();
    const second = vi.fn();
    subscribe('user-a', first);
    subscribe('user-a', second);
    publish('user-a', { type: 'presence', userId: 'user-a', isOnline: true, lastActiveAt: 'now' });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('publishNotification reaches only the recipient', () => {
    const notification = {
      id: 'n1', type: 'MESSAGE' as const, entityId: 'm1', isRead: false, createdAt: 'now',
      actor: { id: 'user-a', name: 'A', username: 'alice', profileImage: null },
    };
    const onRecipient = vi.fn();
    const onActor = vi.fn();
    subscribe('user-b', onRecipient);
    subscribe('user-a', onActor);
    publishNotification(notification, 'user-b');
    expect(onRecipient).toHaveBeenCalledTimes(1);
    expect(onRecipient.mock.calls[0][0]).toMatchObject({ type: 'notification', notification });
    expect(onActor).not.toHaveBeenCalled();
  });

  it('publishCallSignal reaches only the named peer and never echoes to the sender', () => {
    const onPeer = vi.fn();
    const onSender = vi.fn();
    subscribe('user-b', onPeer);
    subscribe('user-a', onSender);
    const sdp = { type: 'offer', sdp: 'v=0' } as RTCSessionDescriptionInit;
    publishCallSignal('user-b', { type: 'call-offer', callId: 'call-1', mediaType: 'video', from: { id: 'user-a', name: 'A', username: 'alice', profileImage: null }, sdp });
    expect(onPeer).toHaveBeenCalledTimes(1);
    expect(onPeer.mock.calls[0][0]).toMatchObject({ type: 'call-offer', callId: 'call-1', mediaType: 'video' });
    expect(onSender).not.toHaveBeenCalled();
  });
});
