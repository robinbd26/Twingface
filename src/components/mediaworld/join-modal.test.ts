import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/components/mediaworld/join-modal.tsx'), 'utf8');
const stylesheet = readFileSync(resolve(process.cwd(), 'src/app/dashboard.css'), 'utf8');

describe('Join as Professional popup', () => {
  it('renders an accessible dialog with the three join destinations', () => {
    expect(source).toContain("role='dialog'");
    expect(source).toContain("aria-modal='true'");
    expect(source).toContain("aria-labelledby='mw-join-modal-title'");
    expect(source).toContain('Join as Professional');

    expect(source.match(/href: '\//g)?.length).toBe(3);
    expect(source).toContain("href: '/mediaworld/register'");
    expect(source).toContain("href: '/for-rent'");
    expect(source).toContain("href: '/channelhub'");

    // Each option carries a custom SVG icon instead of an emoji.
    expect(source.match(/<svg viewBox='0 0 24 24'/g)?.length).toBe(4);
    expect(source.match(/<Link/g)?.length).toBe(1);
    expect(source).toContain('className={`mw-join-modal-option mw-join-modal-option-${option.tone}`}');
  });

  it('closes on Escape, backdrop press and the close button', () => {
    expect(source).toContain("if (event.key === 'Escape') onCloseRef.current();");
    expect(source).toContain('if (event.target === event.currentTarget) onClose();');
    expect(source).toContain('className=\'mw-join-modal-close\'');
    expect(source).toContain("aria-label='Close'");
  });

  it('locks background scroll and restores focus to the trigger', () => {
    expect(source).toContain("document.body.style.overflow = 'hidden'");
    expect(source).toContain('document.body.style.overflow = previousOverflow');
    expect(source).toContain('previousFocus?.focus?.()');
    expect(source).toContain("panelRef.current?.querySelector<HTMLElement>('.mw-join-modal-option')?.focus()");
  });

  it('is themed with gradient icon tiles, a scrim and a mobile layout', () => {
    expect(stylesheet).toContain('.mw-join-modal-backdrop{position:fixed;inset:0;z-index:90');
    expect(stylesheet).toContain('backdrop-filter:blur(6px)');
    expect(stylesheet).toContain('.mw-join-modal-option-amber .mw-join-modal-icon{');
    expect(stylesheet).toContain('.mw-join-modal-option-violet .mw-join-modal-icon{');
    expect(stylesheet).toContain('@keyframes mw-join-pop');
    expect(stylesheet).toContain('.mw-join-modal{padding:20px 16px;border-radius:18px}');
  });

  it('sends visitors to sign-up instead of the login-walled member routes', () => {
    expect(source).toContain('authenticated: boolean;');
    expect(source).toContain('export default function JoinModal({ open, onClose, authenticated }: JoinModalProps) {');
    expect(source).toContain('const href = authenticated ? option.href : option.visitorHref ?? option.href;');
    expect(source).toContain('const copy = authenticated ? option.copy : option.visitorCopy ?? option.copy;');
    expect(source).toContain('const unavailable = option.visitorUnavailable === true && !authenticated;');

    // For Rent has its own sign-up page, so visitors are not routed through the
    // professional wizard first.
    expect(source).toContain("visitorHref: '/for-rent/register'");
    expect(source).toContain(
      "visitorCopy: 'Open a For Rent account with your details and rental service in one form, then list gear, a vehicle or a location.'",
    );
    expect(source).not.toContain("visitorHref: '/mediaworld/register'");
  });

  it('keeps the ChannelHub card honest and non-clickable for visitors', () => {
    expect(source).toContain("copy: 'Coming soon — creator channels and publishing tools are not open yet.'");
    expect(source).toContain("visitorCopy: 'Coming soon — there is no separate ChannelHub sign-up yet.'");
    expect(source).toContain('visitorUnavailable: true');
    expect(source).toContain('aria-disabled=\'true\'');
    expect(source).toContain(
      'className={`mw-join-modal-option mw-join-modal-option-${option.tone} is-unavailable`}',
    );
    expect(source).toContain("<span className='mw-join-modal-soon'>soon</span>");

    // No claim that every destination is open.
    expect(source).not.toContain('you can explore the rest anytime');
  });

  it('styles the unavailable card so it does not look clickable', () => {
    expect(stylesheet).toContain('.mw-join-modal-option.is-unavailable{cursor:default');
    expect(stylesheet).toContain('.mw-join-modal-option.is-unavailable:hover{transform:none');
    expect(stylesheet).toContain('.mw-join-modal-option.is-unavailable .mw-join-modal-icon{opacity:.55');
    expect(stylesheet).toContain('.mw-join-modal-soon{');
  });
});
