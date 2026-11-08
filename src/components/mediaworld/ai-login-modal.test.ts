import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/components/mediaworld/ai-login-modal.tsx'), 'utf8');
const stylesheet = readFileSync(resolve(process.cwd(), 'src/app/dashboard.css'), 'utf8');

describe('Media World login popup dismissal', () => {
  it('renders a named dialog', () => {
    expect(source).toContain("role='dialog' aria-modal='true' aria-labelledby='mw-login-modal-title'");
    expect(source).toContain("id='mw-login-modal-title'");
  });

  it('gives the visitor a labelled Back control that closes the popup', () => {
    expect(source).toContain("data-testid='mw-login-back'");
    expect(source).toContain('onClick={onClose}');
    expect(source).toContain("{bn ? '← পেছনে ফিরুন' : '← Back'}");
    // The Back control must never navigate: it only dismisses the overlay.
    expect(source.slice(source.indexOf("data-testid='mw-login-back'")).split('</button>')[0]).not.toContain('window.location');
    expect(stylesheet).toContain('.login-back{border:0;background:transparent;color:#64748b;padding:4px 0;cursor:pointer');
    expect(stylesheet).toContain('.login-back:hover{color:#e2e8f0}');
    expect(stylesheet).toContain('.login-back:focus-visible{outline:2px solid #72aaff');
  });

  it('closes on Escape and restores what the trigger owned', () => {
    expect(source).toContain("if (event.key === 'Escape') onClose();");
    expect(source).toContain('const returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;');
    expect(source).toContain('if (returnFocusTo && document.contains(returnFocusTo)) returnFocusTo.focus();');
    expect(source).toContain("document.body.style.overflow = 'hidden'");
    expect(source).toContain('document.body.style.overflow = previousOverflow');
  });

  it('moves focus into the form and keeps that effect off the parent-render path', () => {
    expect(source).toContain('emailRef.current?.focus()');
    expect(source).toContain('ref={emailRef}');

    const focusEffect = source.slice(source.indexOf('const returnFocusTo'), source.indexOf('}, [open]);'));
    expect(focusEffect).not.toContain('onClose');
    expect(source).toContain('}, [open]);');
    expect(source).toContain('}, [open, onClose]);');
  });
});
