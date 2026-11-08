import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { rentalListingReport: { findUnique: mocks.findUnique, update: mocks.update } } }));

import { PATCH } from './route';

const admin = { id: 'admin1', name: 'Admin', username: 'root', email: null, profileImage: null, role: 'SUPER_ADMIN' };
const OPEN = { id: 'report1', status: 'OPEN' as const };

function callPatch(body: unknown, id = 'report1') {
  return PATCH(
    new Request(`http://localhost/api/mediaworld/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

function updated(status: string) {
  return {
    id: 'report1',
    status,
    reason: 'Misleading photos',
    details: 'The camera body shown is not the listed model.',
    createdAt: new Date('2026-10-05T00:00:00.000Z'),
    listingId: 'listing1',
    listing: { id: 'listing1', title: 'Sony FX3 cinema camera', isActive: true, availability: 'AVAILABLE', provider: { id: 'provider1', businessName: 'Lens House' } },
    reporter: { id: 'member1', name: 'Rafiq Ahmed', username: 'rafiq' },
  };
}

describe('/api/mediaworld/admin/reports/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(admin);
    mocks.findUnique.mockResolvedValue(OPEN);
    mocks.update.mockImplementation(async ({ data }: { data: { status: string } }) => updated(data.status));
  });

  it('requires a super admin session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await callPatch({ status: 'IN_REVIEW' })).status).toBe(401);

    mocks.getCurrentUser.mockResolvedValue({ ...admin, role: 'USER' });
    expect((await callPatch({ status: 'IN_REVIEW' })).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('walks the queue forward: open -> in review -> resolved', async () => {
    const review = await callPatch({ status: 'IN_REVIEW' });
    expect(review.status).toBe(200);
    expect((await review.json()).report.status).toBe('IN_REVIEW');

    mocks.findUnique.mockResolvedValue({ id: 'report1', status: 'IN_REVIEW' });
    const resolved = await callPatch({ status: 'RESOLVED' });
    expect(resolved.status).toBe(200);
    expect(mocks.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { status: 'RESOLVED' } }));
  });

  it('never lets a finished report be reopened', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'report1', status: 'RESOLVED' });

    const response = await callPatch({ status: 'OPEN' });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('final');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('rejects a transition that skips the review step from in review back to open', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'report1', status: 'IN_REVIEW' });

    const response = await callPatch({ status: 'OPEN' });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('Allowed next steps: Resolved, Dismissed');
  });

  it('reports a no-op as already closed at that status', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'report1', status: 'DISMISSED' });

    const response = await callPatch({ status: 'DISMISSED' });

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe('Report is already Dismissed.');
  });

  it('validates the status value and the report id', async () => {
    const badStatus = await callPatch({ status: 'DELETED' });
    expect(badStatus.status).toBe(400);
    expect((await badStatus.json()).fields.status).toHaveLength(1);

    mocks.findUnique.mockResolvedValue(null);
    const missing = await callPatch({ status: 'IN_REVIEW' }, 'nosuchreport');
    expect(missing.status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('only exposes moderation fields, never credentials', async () => {
    const body = await (await callPatch({ status: 'IN_REVIEW' })).json();

    expect(JSON.stringify(body)).not.toMatch(/passwordHash|publicId/);
  });
});
