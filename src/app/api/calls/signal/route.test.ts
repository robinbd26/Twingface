import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  userFindUnique: vi.fn(),
  friendshipFindUnique: vi.fn(),
  publishCallSignal: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    friendship: { findUnique: mocks.friendshipFindUnique },
  },
}));
vi.mock('@/lib/realtime', () => ({ publishCallSignal: mocks.publishCallSignal }));

import { POST } from './route';

const viewer = { id: 'user-a', name: 'A', username: 'alice', email: 'alice@example.com', profileImage: null };
const sdp = { type: 'offer', sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1' };

const request = (body: unknown) => new Request('http://localhost/api/calls/signal', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

describe('call signal relay API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(viewer);
    mocks.userFindUnique.mockResolvedValue({ id: 'user-b' });
    mocks.friendshipFindUnique.mockResolvedValue({ status: 'ACCEPTED' });
  });

  it('requires a session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await POST(request({ kind: 'offer', toUserId: 'user-b', callId: 'call-12345678', mediaType: 'video', sdp }));
    expect(response.status).toBe(401);
    expect(mocks.publishCallSignal).not.toHaveBeenCalled();
  });

  it('rejects an invalid payload', async () => {
    expect((await POST(request({ kind: 'bogus', toUserId: 'user-b', callId: 'call-12345678' }))).status).toBe(400);
    expect((await POST(request({ kind: 'offer', toUserId: 'user-b', callId: 'short' }))).status).toBe(400);
    expect(mocks.publishCallSignal).not.toHaveBeenCalled();
  });

  it('rejects self calls and unknown users', async () => {
    expect((await POST(request({ kind: 'offer', toUserId: 'user-a', callId: 'call-12345678', mediaType: 'audio', sdp }))).status).toBe(400);
    mocks.userFindUnique.mockResolvedValue(null);
    expect((await POST(request({ kind: 'offer', toUserId: 'user-z', callId: 'call-12345678', mediaType: 'audio', sdp }))).status).toBe(404);
  });

  it('rejects calling a non-friend with 403', async () => {
    mocks.friendshipFindUnique.mockResolvedValue(null);
    const response = await POST(request({ kind: 'offer', toUserId: 'user-b', callId: 'call-12345678', mediaType: 'audio', sdp }));
    expect(response.status).toBe(403);
    expect(mocks.publishCallSignal).not.toHaveBeenCalled();
  });

  it('relays an offer to the recipient with the verified sender identity', async () => {
    const response = await POST(request({ kind: 'offer', toUserId: 'user-b', callId: 'call-12345678', mediaType: 'video', sdp }));
    expect(response.status).toBe(200);
    expect(mocks.publishCallSignal).toHaveBeenCalledWith('user-b', expect.objectContaining({
      type: 'call-offer', callId: 'call-12345678', mediaType: 'video',
      from: { id: 'user-a', name: 'A', username: 'alice', profileImage: null },
    }));
  });

  it('relays answer, ice, reject and end signals', async () => {
    await POST(request({ kind: 'answer', toUserId: 'user-b', callId: 'call-12345678', sdp: { type: 'answer', sdp: 'a' } }));
    expect(mocks.publishCallSignal).toHaveBeenLastCalledWith('user-b', expect.objectContaining({ type: 'call-answer', callId: 'call-12345678' }));

    await POST(request({ kind: 'ice', toUserId: 'user-b', callId: 'call-12345678', candidate: { candidate: 'cand' } }));
    expect(mocks.publishCallSignal).toHaveBeenLastCalledWith('user-b', expect.objectContaining({ type: 'call-ice', callId: 'call-12345678', candidate: { candidate: 'cand' } }));

    await POST(request({ kind: 'reject', toUserId: 'user-b', callId: 'call-12345678' }));
    expect(mocks.publishCallSignal).toHaveBeenLastCalledWith('user-b', { type: 'call-reject', callId: 'call-12345678' });

    await POST(request({ kind: 'end', toUserId: 'user-b', callId: 'call-12345678' }));
    expect(mocks.publishCallSignal).toHaveBeenLastCalledWith('user-b', { type: 'call-end', callId: 'call-12345678' });
  });

  it('relays a mid-call ICE-restart offer without a media type', async () => {
    const response = await POST(request({ kind: 'offer-restart', toUserId: 'user-b', callId: 'call-12345678', sdp }));
    expect(response.status).toBe(200);
    expect(mocks.publishCallSignal).toHaveBeenLastCalledWith('user-b', expect.objectContaining({
      type: 'call-offer-restart', callId: 'call-12345678',
    }));
  });
});
