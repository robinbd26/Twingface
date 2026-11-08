import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const modal = () =>
  readFileSync(resolve(process.cwd(), 'src/components/mediaworld/mediaworld-complaint-modal.tsx'), 'utf8');

const stylesheet = () => readFileSync(resolve(process.cwd(), 'src/app/dashboard.css'), 'utf8');

describe('MediaWorld complaint modal', () => {
  it('renders a centered dialog that embeds the shared complaint form', () => {
    const source = modal();

    expect(source).toContain("'use client'");
    expect(source).toContain("className='mediaworld-complaint-modal-backdrop'");
    expect(source).toContain("className='mediaworld-complaint-modal'");
    expect(source).toContain("role='dialog'");
    expect(source).toContain("aria-modal='true'");
    expect(source).toContain('<ComplaintForm />');
    expect(source).toContain('MediaWorldLanguageToggle');
  });

  it('closes on backdrop click, the close button and the Escape key', () => {
    const source = modal();

    expect(source).toContain('if (event.target === event.currentTarget) onClose();');
    expect(source).toContain("data-testid='mediaworld-complaint-modal-close'");
    expect(source).toContain("if (event.key === 'Escape') onClose();");
    expect(source).toContain('if (!open) return null;');
  });

  it('ships the modal styling in the shared dashboard stylesheet', () => {
    const css = stylesheet();

    expect(css).toContain('.mediaworld-complaint-modal-backdrop{');
    expect(css).toContain('place-items:center');
    expect(css).toContain('.mediaworld-complaint-modal{');
    expect(css).toContain('.mediaworld-complaint-modal-body{');
    expect(css).toContain('.mediaworld-complaint-modal-close{');
  });
});
