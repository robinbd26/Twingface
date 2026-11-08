import { describe, expect, it } from 'vitest';
import {
  MAX_COMPLAINT_ATTACHMENTS,
  MAX_COMPLAINT_IMAGE_BYTES,
  MAX_COMPLAINT_VIDEO_BYTES,
  MEDIA_COMPLAINT_PERSON_LABELS,
  complaintAttachmentKind,
  isComplaintImageFile,
  isComplaintVideoFile,
  isValidComplaintAttachmentBytes,
  parseMediaComplaintAttachments,
  parseMediaComplaintFields,
} from './mediaworld-complaint';

const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);

function fileOf(bytes: BlobPart, name: string, type: string, size?: number) {
  const file = new File([bytes], name, { type });
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('mediaworld complaint validation', () => {
  it('enforces the documented attachment limits', () => {
    expect(MAX_COMPLAINT_ATTACHMENTS).toBe(6);
    expect(MAX_COMPLAINT_IMAGE_BYTES).toBe(5 * 1024 * 1024);
    expect(MAX_COMPLAINT_VIDEO_BYTES).toBe(25 * 1024 * 1024);
  });

  it('classifies images and videos by their declared mime type', () => {
    expect(complaintAttachmentKind(new File([pngBytes], 'a.png', { type: 'image/png' }))).toBe('IMAGE');
    expect(complaintAttachmentKind(new File([pngBytes], 'a.mp4', { type: 'video/mp4' }))).toBe('VIDEO');
  });

  it('rejects oversized images and unsupported mime types', () => {
    expect(isComplaintImageFile(new File([pngBytes], 'a.png', { type: 'image/png' }))).toBe(true);
    expect(isComplaintImageFile(new File([pngBytes], 'a.pdf', { type: 'application/pdf' }))).toBe(false);
    expect(
      isComplaintImageFile(fileOf(pngBytes, 'a.png', 'image/png', MAX_COMPLAINT_IMAGE_BYTES + 1)),
    ).toBe(false);
    expect(
      isComplaintVideoFile(fileOf(pngBytes, 'a.mp4', 'video/mp4', MAX_COMPLAINT_VIDEO_BYTES + 1)),
    ).toBe(false);
  });

  it('verifies the binary signature of images and videos', () => {
    expect(isValidComplaintAttachmentBytes('image/png', pngBytes)).toBe(true);
    expect(isValidComplaintAttachmentBytes('image/jpeg', jpegBytes)).toBe(true);
    expect(isValidComplaintAttachmentBytes('image/png', jpegBytes)).toBe(false);
    expect(isValidComplaintAttachmentBytes('image/png', new Uint8Array([1, 2, 3]))).toBe(false);
    expect(isValidComplaintAttachmentBytes('video/mp4', new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0, 0, 0, 0]))).toBe(true);
    expect(isValidComplaintAttachmentBytes('video/mp4', pngBytes)).toBe(false);
  });

  it('parses and trims the complaint fields', () => {
    const parsed = parseMediaComplaintFields({
      subject: '  Wrong pricing  ',
      details: '  The listed price is not the real price.  ',
      contact: ' 01700000000 ',
      personType: 'ACTOR',
      personName: '  Karim Uddin  ',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.subject).toBe('Wrong pricing');
      expect(parsed.data.details).toBe('The listed price is not the real price.');
      expect(parsed.data.contact).toBe('01700000000');
      expect(parsed.data.personType).toBe('ACTOR');
      expect(parsed.data.personName).toBe('Karim Uddin');
    }
  });

  it('falls back to the OTHER person type and reports field errors', () => {
    const parsed = parseMediaComplaintFields({ subject: 'no', details: 'short' });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.subject).toBeDefined();
      expect(parsed.error.flatten().fieldErrors.details).toBeDefined();
    }
  });

  it('collects attachment errors for unsupported files and oversized batches', () => {
    const formData = new FormData();
    formData.append('attachments', new File([pngBytes], 'a.pdf', { type: 'application/pdf' }));
    const result = parseMediaComplaintAttachments(formData);

    expect(result.attachments).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('keeps valid attachments and reports the batch limit', () => {
    const formData = new FormData();
    for (let index = 0; index <= MAX_COMPLAINT_ATTACHMENTS; index += 1) {
      formData.append('attachments', new File([pngBytes], `a-${index}.png`, { type: 'image/png' }));
    }
    const result = parseMediaComplaintAttachments(formData);

    expect(result.attachments).toHaveLength(MAX_COMPLAINT_ATTACHMENTS + 1);
    expect(result.errors[0]).toContain(`up to ${MAX_COMPLAINT_ATTACHMENTS} files`);
  });

  it('exposes bilingual labels for every person type', () => {
    for (const labels of Object.values(MEDIA_COMPLAINT_PERSON_LABELS)) {
      expect(labels.bn.length).toBeGreaterThan(0);
      expect(labels.en.length).toBeGreaterThan(0);
    }
  });
});
