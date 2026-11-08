import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock('@/lib/db', () => ({ prisma: { $queryRaw: mocks.queryRaw } }));

import { GET } from './route';

describe('GET /api/health', () => {
  beforeEach(() => {
    mocks.queryRaw.mockReset();
    vi.restoreAllMocks();
  });

  it('reports ok with a latency reading when the database answers', async () => {
    mocks.queryRaw.mockResolvedValue([{ ok: 1 }]);

    const body = await (await GET()).json();

    expect(body.status).toBe('ok');
    expect(body.db.connected).toBe(true);
    expect(typeof body.db.latencyMs).toBe('number');
  });

  it('reports degraded without exposing the driver error text', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.queryRaw.mockRejectedValue(
      new Error('connect ECONNREFUSED 10.0.0.5:5432 - postgres://admin:super-secret@db.internal')
    );

    const body = await (await GET()).json();

    expect(body.status).toBe('degraded');
    expect(body.db).toEqual({ connected: false });
    expect(JSON.stringify(body)).not.toContain('super-secret');
    expect(spy).toHaveBeenCalledWith('[health] database check failed:', expect.any(Error));
  });
});
