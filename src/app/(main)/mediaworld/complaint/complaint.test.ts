import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('MediaWorld complaint page', () => {
  it('guards the complaint page behind the session and renders the Bengali heading', () => {
    const page = read('src/app/(main)/mediaworld/complaint/page.tsx');

    expect(page).toContain("import { getCurrentUser } from '@/lib/auth'");
    expect(page).toContain("if (!user) redirect('/login')");
    expect(page).toContain('সমস্যা জানাও');
    expect(page).not.toContain('সমস্টি জানাও');
    expect(page).toContain('<ComplaintForm />');
  });

  it('wraps the standalone complaint page in the shared language provider and toggle', () => {
    const page = read('src/app/(main)/mediaworld/complaint/page.tsx');

    expect(page).toContain('<MediaWorldLanguageProvider>');
    expect(page).toContain('<MediaWorldLanguageToggle />');
    expect(page).toContain('mediaworld-language-bar');
  });

  it('submits the complaint form to the authenticated API with validation and status states', () => {
    const form = read('src/app/(main)/mediaworld/complaint/complaint-form.tsx');

    expect(form).toContain("'use client'");
    expect(form).toContain("fetch('/api/mediaworld/complaint'");
    expect(form).toContain("method: 'POST'");
    expect(form).toContain('Subject must be 3-120 characters.');
    expect(form).toContain('Details must be 10-2000 characters.');
    expect(form).toContain('Contact must be 120 characters or fewer.');
    expect(form).toContain('submitting');
    expect(form).toContain('serverMsg');
    expect(form).toContain('role="alert"');
    expect(form).toContain("href='/mediaworld'");
  });

  it('collects the complainant details and submits multipart evidence', () => {
    const form = read('src/app/(main)/mediaworld/complaint/complaint-form.tsx');

    expect(form).toContain('personType');
    expect(form).toContain('personName');
    expect(form).toContain('MEDIA_COMPLAINT_PERSON_LABELS');
    expect(form).toContain('new FormData()');
    expect(form).toContain("body.append('attachments'");
    expect(form).toContain('MAX_COMPLAINT_ATTACHMENTS');
    expect(form).toContain('MAX_COMPLAINT_IMAGE_BYTES');
    expect(form).toContain('MAX_COMPLAINT_VIDEO_BYTES');
  });

  it('renders bilingual labels that follow the shared MediaWorld language toggle', () => {
    const form = read('src/app/(main)/mediaworld/complaint/complaint-form.tsx');

    expect(form).toContain('useMediaWorldLanguage');
    expect(form).toContain('বিষয়');
    expect(form).toContain('বিস্তারিত');
    expect(form).toContain('প্রমাণ (ছবি বা ভিডিও)');
    expect(form).toContain('কার সম্পর্কে অভিযোগ?');
  });

  it('previews and removes selected evidence files', () => {
    const form = read('src/app/(main)/mediaworld/complaint/complaint-form.tsx');

    expect(form).toContain('URL.createObjectURL(file)');
    expect(form).toContain('URL.revokeObjectURL');
    expect(form).toContain('removeAttachment');
    expect(form).toContain('mediaworld-complaint-preview');
  });
});
