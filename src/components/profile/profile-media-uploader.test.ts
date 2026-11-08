import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('ProfileMediaUploader source contract', () => {
  it('provides an accessible restricted image file input and multipart request', () => {
    const source = read('src/components/profile/profile-media-uploader.tsx');

    expect(source).toContain("const inputId = `profile-media-${kind}-input`");
    expect(source).toContain("id={inputId}");
    expect(source).toContain("className='profile-media-trigger'");
    expect(source).toContain('htmlFor={inputId}');
    expect(source).toContain("accept='image/jpeg,image/png,image/webp,image/gif'");
    expect(source).toContain("formData.set('kind', kind)");
    expect(source).toContain("formData.set('image', image)");
    expect(source).toContain("fetch('/api/profile/media'");
    expect(source).not.toContain("'Content-Type': 'multipart/form-data'");
  });

  it('communicates upload pending and error states accessibly', () => {
    const source = read('src/components/profile/profile-media-uploader.tsx');

    expect(source).toContain('aria-live');
    expect(source).toContain("role={message && !message.endsWith('updated.') ? 'alert' : 'status'}");
    expect(source).toContain('disabled={uploading}');
    expect(source).toContain('MAX_PROFILE_MEDIA_BYTES');
  });

  it('keeps profile-media styles scoped', () => {
    const stylesheet = read('src/app/dashboard.css');

    expect(stylesheet).toContain('.profile-media-uploader');
    expect(stylesheet).toContain('.profile-media-feedback');
  });

  it('makes the entire visible cover-photo control an image-picker trigger', () => {
    const stylesheet = read('src/app/dashboard.css');

    expect(stylesheet).toContain('.profile-media-uploader.fb-cover-edit{padding:0}');
    expect(stylesheet).toContain('.profile-media-uploader.fb-cover-edit>.profile-media-trigger{padding:7px 13px}');
  });
});
