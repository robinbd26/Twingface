import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn(), executeRaw: vi.fn() }));

vi.mock('@/lib/db', () => ({ prisma: { $queryRaw: mocks.queryRaw, $executeRaw: mocks.executeRaw } }));

import {
  RATE_LIMIT_MESSAGE,
  clientIp,
  consumeRateLimit,
  loginIdentifierKey,
  loginIpKey,
  rateLimitedResponse,
  resetRateLimit,
  signupIpKey,
} from './rate-limit';

const rule = { limit: 5, windowMs: 60_000 };

describe('consumeRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.executeRaw.mockResolvedValue(0);
  });

  it('allows attempts under the limit and reports the remaining budget', async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 2, retry_after_seconds: 30 }]);

    const decision = await consumeRateLimit('login:ip:203.0.113.10', rule);

    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBe(3);
    expect(decision.retryAfterSeconds).toBe(30);
  });

  it('allows the last attempt inside the window and blocks the next one', async () => {
    mocks.queryRaw.mockResolvedValueOnce([{ count: 5, retry_after_seconds: 60 }]);
    const last = await consumeRateLimit('key', rule);

    mocks.queryRaw.mockResolvedValueOnce([{ count: 6, retry_after_seconds: 60 }]);
    const blocked = await consumeRateLimit('key', rule);

    expect(last).toMatchObject({ allowed: true, remaining: 0 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('reports a full budget when the counter row is missing from the response', async () => {
    mocks.queryRaw.mockResolvedValue([]);

    await expect(consumeRateLimit('key', rule)).resolves.toEqual({ allowed: true, remaining: 5, retryAfterSeconds: 0 });
  });

  it('prunes expired counters when a fresh window starts', async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 1, retry_after_seconds: 60 }]);

    await consumeRateLimit('key', rule);

    expect(mocks.executeRaw).toHaveBeenCalledTimes(1);
  });

  it('does not prune on every attempt inside the same window', async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 3, retry_after_seconds: 60 }]);

    await consumeRateLimit('key', rule);

    expect(mocks.executeRaw).not.toHaveBeenCalled();
  });
});

describe('resetRateLimit', () => {
  it('deletes the counter for the key', async () => {
    mocks.executeRaw.mockResolvedValue(1);

    await resetRateLimit('login:id:username:farah.rahman');

    expect(mocks.executeRaw).toHaveBeenCalledTimes(1);
  });
});

describe('rateLimitedResponse', () => {
  it('returns 429 with Retry-After and a generic message', async () => {
    const response = rateLimitedResponse({ allowed: false, remaining: 0, retryAfterSeconds: 240 });

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('240');
    await expect(response.json()).resolves.toEqual({ error: RATE_LIMIT_MESSAGE });
  });
});

describe('clientIp', () => {
  const withHeaders = (headers: Record<string, string>) => new Request('http://localhost/api/auth/login', { headers });

  it('uses the first forwarded address', () => {
    expect(clientIp(withHeaders({ 'x-forwarded-for': '203.0.113.10, 10.0.0.1' }))).toBe('203.0.113.10');
  });

  it('falls back to x-real-ip and then to a shared unknown bucket', () => {
    expect(clientIp(withHeaders({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
    expect(clientIp(withHeaders({}))).toBe('unknown');
  });
});

describe('rate limit keys', () => {
  it('keeps login and signup buckets separate', () => {
    expect(loginIpKey('203.0.113.10')).toBe('login:ip:203.0.113.10');
    expect(loginIdentifierKey('email', 'farah@example.com')).toBe('login:id:email:farah@example.com');
    expect(signupIpKey('register', '203.0.113.10')).toBe('signup:register:ip:203.0.113.10');
    expect(signupIpKey('mediaworld', '203.0.113.10')).toBe('signup:mediaworld:ip:203.0.113.10');
    expect(signupIpKey('rental', '203.0.113.10')).toBe('signup:rental:ip:203.0.113.10');
  });
});
