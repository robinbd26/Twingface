import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { user: { update: mocks.update } } }));

import { PATCH } from './route';

const body = {
  name: 'Farah Rahman',
  email: 'farah@example.com',
  phone: '01712345678',
  division: 'Dhaka',
  district: 'Gazipur',
  presentAddress: 'House 12, Road 5, Dhanmondi',
};

function request(value: unknown) {
  return new Request('http://localhost/api/mediaworld/profile/personal', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
}

describe('PATCH /api/mediaworld/profile/personal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1', name: 'Farah Rahman' });
    mocks.update.mockResolvedValue({
      name: 'Farah Rahman',
      email: 'farah@example.com',
      phone: '+8801712345678',
      division: 'Dhaka',
      district: 'Gazipur',
      presentAddress: 'House 12, Road 5, Dhanmondi',
    });
  });

  it('requires a session', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await PATCH(request(body));

    expect(response.status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('updates only the signed-in account with normalized details', async () => {
    const response = await PATCH(request(body));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { ...body, phone: '+8801712345678' },
      select: expect.objectContaining({ phone: true, presentAddress: true }),
    });
  });

  it('updates the bio when the wizard collects one', async () => {
    const response = await PATCH(request({ ...body, bio: '  Stage actor ' }));

    expect(response.status).toBe(200);
    expect(mocks.update.mock.calls[0][0].data.bio).toBe('Stage actor');
    expect(mocks.update.mock.calls[0][0].select).toMatchObject({ bio: true });
  });

  it('clears the bio when it is submitted blank', async () => {
    const response = await PATCH(request({ ...body, bio: '   ' }));

    expect(response.status).toBe(200);
    expect(mocks.update.mock.calls[0][0].data.bio).toBeNull();
  });

  it('rejects a district outside the selected division', async () => {
    const response = await PATCH(request({ ...body, district: 'Sylhet' }));

    expect(response.status).toBe(400);
    expect((await response.json()).fields.district).toBeTruthy();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('rejects credentials smuggled into the profile payload', async () => {
    const response = await PATCH(request({ ...body, password: 'StrongPass123' }));

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('reports a duplicate mobile number safely', async () => {
    mocks.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['phone'] },
    }));

    const response = await PATCH(request(body));

    expect(response.status).toBe(409);
    expect((await response.json()).fields).toEqual({ phone: ['That mobile number is already in use.'] });
  });

  it('returns a generic failure for unexpected errors', async () => {
    mocks.update.mockRejectedValue(new Error('connection lost'));

    const response = await PATCH(request(body));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Unable to update your details.' });
  });
});
