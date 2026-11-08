import {
  COMPLAINT_IMAGE_MIME_TYPES,
  isValidComplaintAttachmentBytes,
  MAX_COMPLAINT_IMAGE_BYTES,
} from '../mediaworld-complaint';

export const MEDIAWORLD_LOGO_MIME_TYPES = COMPLAINT_IMAGE_MIME_TYPES;
export const MAX_MEDIAWORLD_LOGO_BYTES = MAX_COMPLAINT_IMAGE_BYTES;

export function isValidLogoFile(mimeType: string, bytes: Uint8Array): boolean {
  return (COMPLAINT_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)
    && isValidComplaintAttachmentBytes(mimeType, bytes);
}
