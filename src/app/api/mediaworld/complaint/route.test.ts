import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  create: vi.fn(),
  uploadComplaintImage: vi.fn(),
  uploadComplaintVideo: vi.fn(),
  destroyComplaintMedia: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db', () => ({ prisma: { mediaComplaint: { create: mocks.create } } }));
vi.mock('@/lib/cloudinary', () => ({
  uploadComplaintImage: mocks.uploadComplaintImage,
  uploadComplaintVideo: mocks.uploadComplaintVideo,
  destroyComplaintMedia: mocks.destroyComplaintMedia,
}));

import { POST } from './route';

const user = { id: 'user-1', name: 'A', username: 'alice', email: 'alice@example.com', profileImage: null };

function request(body: unknown) {
  return new Request('http://localhost/api/mediaworld/complaint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('mediaworld complaint API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(user);
    mocks.create.mockResolvedValue({ id: 'c-1', subject: 'Wrong pricing', status: 'OPEN', createdAt: new Date() });
    mocks.uploadComplaintImage.mockResolvedValue({
      imageUrl: 'https://cdn.example.com/proof.png',
      imagePublicId: 'mediaworld/complaints/user-1/proof',
    });
    mocks.uploadComplaintVideo.mockResolvedValue({
      imageUrl: 'https://cdn.example.com/proof.mp4',
      imagePublicId: 'mediaworld/complaints/user-1/proof',
    });
    mocks.destroyComplaintMedia.mockResolvedValue(undefined);
  });

  it('requires authentication', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await POST(request({ subject: 'Wrong pricing', details: 'The listed price is not the real price.' }));

    expect(response.status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects a body that is not an object', async () => {
    const response = await POST(
      new Request('http://localhost/api/mediaworld/complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '"nope"',
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('validates the subject and details length', async () => {
    const response = await POST(request({ subject: 'no', details: 'short' }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.fields.subject).toBeDefined();
    expect(json.fields.details).toBeDefined();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('stores a trimmed complaint for the signed-in user', async () => {
    const response = await POST(
      request({ subject: '  Wrong pricing  ', details: '  The listed price is not the real price.  ', contact: ' 01700000000 ' }),
    );

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        subject: 'Wrong pricing',
        details: 'The listed price is not the real price.',
        contact: '01700000000',
        personType: 'OTHER',
        personName: null,
      }),
      select: expect.objectContaining({ id: true, subject: true, status: true }),
    });
    expect((await response.json()).complaint.status).toBe('OPEN');
  });

  it('keeps contact optional', async () => {
    const response = await POST(request({ subject: 'Wrong pricing', details: 'The listed price is not the real price.' }));

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ contact: null }) }));
  });

  it('persists the complainant person details', async () => {
    const response = await POST(
      request({
        subject: 'Wrong pricing',
        details: 'The listed price is not the real price.',
        personType: 'ACTRESS',
        personName: '  Karim Uddin  ',
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ personType: 'ACTRESS', personName: 'Karim Uddin' }) }),
    );
  });

  it('uploads multipart attachments and stores them with the complaint', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const body = new FormData();
    body.set('subject', 'Wrong pricing');
    body.set('details', 'The listed price is not the real price.');
    body.set('personType', 'ACTOR');
    body.set('personName', 'Karim Uddin');
    body.append('attachments', new File([pngBytes], 'proof.png', { type: 'image/png' }));

    const response = await POST(
      new Request('http://localhost/api/mediaworld/complaint', { method: 'POST', body }),
    );

    expect(response.status).toBe(201);
    expect(mocks.uploadComplaintImage).toHaveBeenCalledTimes(1);
    expect(mocks.uploadComplaintVideo).not.toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attachments: {
            create: [
              expect.objectContaining({
                url: 'https://cdn.example.com/proof.png',
                kind: 'IMAGE',
                mimeType: 'image/png',
                position: 0,
              }),
            ],
          },
        }),
      }),
    );
  });

  it('rejects an attachment whose binary signature does not match the declared type', async () => {
    const body = new FormData();
    body.set('subject', 'Wrong pricing');
    body.set('details', 'The listed price is not the real price.');
    body.append('attachments', new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])], 'fake.png', { type: 'image/png' }));

    const response = await POST(
      new Request('http://localhost/api/mediaworld/complaint', { method: 'POST', body }),
    );

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.uploadComplaintImage).not.toHaveBeenCalled();
  });

  it('cleans up already uploaded media when the database write fails', async () => {
    mocks.create.mockRejectedValueOnce(new Error('db down'));

    const body = new FormData();
    body.set('subject', 'Wrong pricing');
    body.set('details', 'The listed price is not the real price.');
    body.append('attachments', new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])], 'proof.png', { type: 'image/png' }));

    const response = await POST(
      new Request('http://localhost/api/mediaworld/complaint', { method: 'POST', body }),
    );

    expect(response.status).toBe(500);
    expect(mocks.destroyComplaintMedia).toHaveBeenCalledWith(['mediaworld/complaints/user-1/proof'], 'image');
  });
});
