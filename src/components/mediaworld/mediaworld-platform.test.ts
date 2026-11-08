import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const platform = () =>
  readFileSync(resolve(process.cwd(), 'src/components/mediaworld/mediaworld-platform.tsx'), 'utf8');

const stylesheet = () => readFileSync(resolve(process.cwd(), 'src/app/dashboard.css'), 'utf8');

describe('MediaWorld platform shell', () => {
  it('keeps the TwingFace sidebar while placing the cinematic discovery hero in the right pane', () => {
    const source = platform();

    expect(source).toContain("<aside className='mediaworld-sidebar'>");
    expect(source).toContain("<nav className='mediaworld-quick-links' aria-label='Main navigation'>");
    expect(source).toContain("<Link href='/dashboard'><span aria-hidden='true'>↗</span> TwingFace</Link>");
    expect(source).not.toContain("<Link href='/login'><span aria-hidden='true'>↪</span> Login</Link>");
    expect(source).not.toContain("<Link href='/dashboard'><span aria-hidden='true'>⌂</span> Home</Link>");
    expect(source).toContain("<main className='mediaworld-main mediaworld-main-cinematic'>");
    expect(source).toContain("className='mediaworld-hero-background'");
    expect(source).toContain("className='mediaworld-hero-content'");
  });

  it('puts the member\'s own photo in the sidebar brand tile, keeping the clapperboard when there is none', () => {
    const source = platform();

    // The photo is whatever the session already resolved: no second lookup, no invented default avatar.
    expect(source).toContain('type MemberAvatar = { name: string; image: string | null };');
    expect(source).toContain('memberAvatar?: MemberAvatar;');
    expect(source).toContain('memberAvatar={memberAvatar}');

    const title = source.slice(source.indexOf("<div className='mediaworld-sidebar-title'>"));
    const avatar = title.indexOf('mediaworld-sidebar-avatar');
    expect(avatar, 'the sidebar title must render the member photo').toBeGreaterThan(-1);
    expect(title).toContain('{memberAvatar?.image ? (');
    expect(title).toContain(
      "<img className='mediaworld-sidebar-avatar' src={memberAvatar.image} alt={memberAvatar.name} />"
    );

    // Visitors and photo-less accounts keep the clapperboard rather than a fake picture.
    expect(title).toContain(') : (');
    const clapper = title.indexOf('🎬');
    expect(clapper, 'the tile must fall back to the clapperboard, never a made-up photo').toBeGreaterThan(avatar);

    // The photo sits in the tile, before the brand text it frames.
    expect(avatar).toBeLessThan(title.indexOf('<strong>TF Media World</strong>'));

    const css = stylesheet();
    expect(css).toContain(
      '.mediaworld-sidebar-avatar{display:block;flex:0 0 34px;width:34px;height:34px;object-fit:cover;border-radius:11px}'
    );
  });

  it('adds centered hero action buttons below the Bengali hero subtitle', () => {
    const source = platform();

    expect(source).toContain("className='mediaworld-hero-actions'");
    expect(source).toContain(
      "className='mediaworld-hero-action mediaworld-hero-action-danger'",
    );
    expect(source).toContain("data-testid='mediaworld-complaint-trigger'");
    expect(source).toContain(
      "data-testid='mediaworld-login-trigger'",
    );
    expect(source).toContain("data-testid='mediaworld-login-trigger'");
    expect(source).toContain('<AILoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />');
    expect(source).toContain('const [loginOpen, setLoginOpen] = useState(false);');
    expect(source).toContain('onClick={() => setLoginOpen(true)}');
    expect(source).toContain('Complain');
    expect(source).toContain('Join as Professional');
    expect(source).toContain('Login');

    // The action row must live directly beneath the Bengali subtitle.
    const subtitleIndex = source.indexOf('mediaworld-hero-subtitle');
    const actionsIndex = source.indexOf('mediaworld-hero-actions');
    expect(subtitleIndex).toBeGreaterThan(-1);
    expect(actionsIndex).toBeGreaterThan(subtitleIndex);

    // The action row itself is centered and stays responsive.
    const css = stylesheet();
    expect(css).toContain('.mediaworld-hero-actions{display:flex');
    expect(css).toContain('justify-content:center');
  });

  it('places the reference service category grid directly beneath the hero', () => {
    const source = platform();

    expect(source).toContain("className='mediaworld-service-categories'");
    expect(source).toContain("className='mediaworld-category-grid'");
    expect(source).toContain('Choose the media category you need.');
    expect(source).toContain('See all services');
  });

  it('adds the available services booking grid beneath the category section', () => {
    const source = platform();

    expect(source).toContain("className='mediaworld-available-services'");
    expect(source).toContain("className='mediaworld-available-grid'");
    expect(source).toContain('List of available services and fares');
    expect(source).toContain('Details / Booking');
  });

  it('adds a compact directory footer below the existing MediaWorld content', () => {
    const source = platform();

    expect(source).toContain("className='mediaworld-directory-footer'");
    expect(source).toContain('TF Media World');
    expect(source).not.toContain('TwingFace Media World');
    expect(source).toContain('Contact and Help');

    // Footer entries are real filters, not placeholder "#camera" anchors.
    expect(source).toContain('onClick={() => filterFromFooter(link.key)}');
    expect(source).toContain('onClick={() => filterDivisionFromFooter(division)}');
    expect(source).not.toContain("href='#");
    expect(source).not.toContain('mediaworld-footer-socials');
    expect(source).not.toContain('Privacy Policy');
  });

  it('makes the sidebar nav and rail see-all buttons move the actual listing view', () => {
    const source = platform();

    expect(source).toContain('function selectNav(key: string)');
    expect(source).toContain('onClick={() => selectNav(item.key)}');
    expect(source).toContain('function showAllServices()');
    expect(source).toContain('onSeeAll={showAllServices}');
    expect(source).toContain("document.getElementById(id)?.scrollIntoView");
    expect(source).toContain("id='mediaworld-available-services'");
    expect(source).toContain("id='mw-rail-rentals'");
  });

  it('wraps the platform in the language provider and renders the top-right language toggle', () => {
    const source = platform();

    expect(source).toContain('<MediaWorldLanguageProvider>');
    expect(source).toContain('<MediaWorldLanguageToggle />');
    expect(source).toContain("className='mediaworld-language-bar'");

    // The toggle must be the first element of the layout so it sits top-right.
    const layoutIndex = source.indexOf("className='mediaworld-platform-layout'");
    const barIndex = source.indexOf("className='mediaworld-language-bar'");
    expect(layoutIndex).toBeGreaterThan(-1);
    expect(barIndex).toBeGreaterThan(layoutIndex);

    const css = stylesheet();
    expect(css).toContain('.mediaworld-language-toggle{');
    expect(css).toContain('.mediaworld-language-bar{');
  });

  it('opens the Join as Professional popup from the hero trigger', () => {
    const source = platform();
    const css = stylesheet();

    expect(source).toContain("import JoinModal from '@/components/mediaworld/join-modal'");
    expect(source).toContain('const [joinOpen, setJoinOpen] = useState(false);');
    expect(source).toContain(
      "className='mediaworld-hero-action mediaworld-hero-action-ghost mw-join-trigger'",
    );
    expect(source).toContain("aria-haspopup='dialog'");
    expect(source).toContain('onClick={() => setJoinOpen(true)}');
    expect(source).toContain("className='mw-join-trigger-icon'");
    expect(source).toContain(
      '<JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} authenticated={authenticated} />',
    );

    // The popup is a themed modal, not an inline dropdown.
    expect(css).toContain('.mw-join-modal-backdrop{position:fixed');
    expect(css).toContain('.mw-join-modal{position:relative;width:min(560px,100%)');
    expect(css).toContain('.mw-join-modal-option-blue .mw-join-modal-icon{');
    expect(css).toContain('.mw-join-modal-icon svg{width:22px;height:22px}');
    expect(css).toContain('@media(prefers-reduced-motion:reduce){.mw-join-modal-backdrop,.mw-join-modal{animation:none}}');
    expect(css).not.toContain('.mw-join-menu{position:absolute');
    expect(css).toContain('.mw-join-trigger{gap:9px;cursor:pointer;font-family:inherit}');
  });

  it('swaps Login and Join for Log out, Rent and Find talent once a session exists', () => {
    const source = platform();

    // The rule is the session alone — no membership column is read for this.
    expect(source).not.toContain('mediaWorldJoined');

    const actionsStart = source.indexOf("<div className='mediaworld-hero-actions'>");
    const actions = source.slice(actionsStart, source.indexOf('</div>', actionsStart));
    expect(actionsStart).toBeGreaterThan(-1);

    // Complain stays for everyone; the split happens after it.
    expect(actions.indexOf('mediaworld-complaint-trigger')).toBeLessThan(actions.indexOf('{!authenticated ? ('));
    expect(actions).toContain("data-testid='mediaworld-login-trigger'");
    expect(actions).toContain("data-testid='mediaworld-join-trigger'");

    const member = actions.slice(actions.indexOf(') : ('));
    expect(member).toContain(
      "<MediaWorldLogoutButton className='mediaworld-hero-action mediaworld-hero-action-ghost' />",
    );
    expect(member).toContain("href='/for-rent'");
    expect(member).toContain("href='/mediaworld/talent'");
    expect(member).toContain("{bn ? 'রেন্ট করুন' : 'Rent'}");
    expect(member).toContain("{bn ? 'ট্যালেন্ড খুঁজুন' : 'Find talent'}");

    // The member's own profile button. The page decides the verb: an existing Media World profile is
    // opened, a missing one is offered for creation, so the label never lies about the destination.
    expect(member).toContain('href={profileCta.href}');
    expect(member).toContain("data-testid='mediaworld-profile-cta'");
    expect(member).toContain("profileCta.kind === 'open'");
    expect(member).toContain("(bn ? 'প্রোফাইল' : 'Profile')");
    expect(member).toContain("(bn ? 'প্রোফাইল তৈরি করুন' : 'Create profile')");
    expect(member).toContain('{profileCta ? (');
    expect(member).toContain(') : null}');
    expect(source).toContain("type ProfileCta = { href: string; kind: 'open' | 'create' };");
    expect(source).toContain('profileCta?: ProfileCta');

    // He asked for that order: profile, then log out, then rent, then find talent.
    expect(member.indexOf('mediaworld-profile-cta')).toBeLessThan(member.indexOf('MediaWorldLogoutButton'));
    expect(member.indexOf('MediaWorldLogoutButton')).toBeLessThan(member.indexOf("href='/for-rent'"));
    expect(member.indexOf("href='/for-rent'")).toBeLessThan(member.indexOf("href='/mediaworld/talent'"));

    // The visitor controls do not leak into the member branch, and sign-out is not
    // re-implemented here — the shared button owns the one fetch call.
    expect(member).not.toContain('mediaworld-login-trigger');
    expect(member).not.toContain('mw-join-trigger');
    expect(source).not.toContain('/api/auth/logout');

    // The sidebar link is the cross-app route to the Twingface newsfeed, so it is not session-gated:
    // a member needs it, and the visitor Login affordance lives in the hero strip.
    const quickLinks = source.indexOf("<nav className='mediaworld-quick-links'");
    expect(quickLinks).toBeGreaterThan(-1);
    expect(source.slice(quickLinks - 40, quickLinks)).not.toContain('{!authenticated ? (');
  });

  it('collapses the sidebar into a chip rail so the page works on phones', () => {
    const css = stylesheet();

    expect(css).toContain('.mediaworld-platform-layout{grid-template-columns:minmax(0,1fr);gap:16px}');
    expect(css).toContain('.mediaworld-sidebar{position:static;flex-direction:row');
    expect(css).toContain('.mediaworld-sidebar::-webkit-scrollbar{display:none}');
    expect(css).toContain('.mediaworld-quick-links,.mediaworld-navigation{display:flex');
    expect(css).toContain('.mediaworld-category-menu,.mediaworld-division-menu');
    expect(css).toContain('.mediaworld-page{padding:14px 10px 38px}');
    expect(css).toContain('.mediaworld-hero-action{flex:0 0 auto;width:100%}');
  });

  it('opens the complaint modal from the hero trigger', () => {
    const source = platform();

    expect(source).toContain("import MediaWorldComplaintModal from '@/components/mediaworld/mediaworld-complaint-modal'");
    expect(source).toContain('const [complaintOpen, setComplaintOpen] = useState(false);');
    expect(source).toContain('onClick={() => setComplaintOpen(true)}');
    expect(source).toContain('<MediaWorldComplaintModal open={complaintOpen} onClose={() => setComplaintOpen(false)} />');
  });

  it('renders only real listing data and keeps the retry button wired to an actual refetch', () => {
    const source = platform();

    // No invented ratings or verification badges: nothing in the API provides them.
    expect(source).not.toContain('★ 4.9');
    expect(source).not.toContain('● Verified');
    expect(source).not.toContain('Verified Talent');
    expect(source).not.toContain('Verified professionals');
    expect(source).toContain("label: 'Featured Talent'");

    // The error retry bumps a reload key consumed by the fetch effect instead of faking a spinner.
    expect(source).toContain('const [reloadKey, setReloadKey] = useState(0);');
    expect(source).toContain('setReloadKey((key) => key + 1)');
    expect(source).toContain(
      '[appliedQuery, activeCategory, activeDivision, activeDistrict, reloadKey]',
    );
    expect(source).not.toContain('setTimeout(');
  });

  it('shows the talent directory inside the services section and filters it by the clicked category', () => {
    const source = platform();

    expect(source).toContain("import TalentCard from '@/components/mediaworld/talent/talent-card'");
    expect(source).toContain("import { talentMatchesLane } from '@/lib/mediaworld/talent-lanes'");
    expect(source).toContain("initialTalents: TalentDirectoryRow[]");
    expect(source).toContain("authenticated: boolean");

    // The profile block lives inside the same section as the fares, so the chips drive both.
    const sectionStart = source.indexOf("className='mediaworld-available-services'");
    const directoryStart = source.indexOf("id='mw-talent-directory'");
    const servicesStart = source.indexOf("className='mediaworld-available-grid'");
    expect(sectionStart).toBeGreaterThan(-1);
    expect(directoryStart).toBeGreaterThan(sectionStart);
    expect(servicesStart).toBeGreaterThan(directoryStart);

    expect(source).toContain('<TalentCard key={talent.id} talent={talent} />');
    expect(source).toContain('talentMatchesLane(talent, activeCategory)');
    expect(source).toContain('if (activeDivision && (talent.division ?? \'\').toLowerCase() !== activeDivision.toLowerCase()) return false;');
    expect(source).toContain('if (activeDistrict && (talent.district ?? \'\').toLowerCase() !== activeDistrict.toLowerCase()) return false;');

    // "Featured Talent" must land on the block that actually holds profiles, and the count is matched vs shown.
    expect(source).toContain("talent: 'mw-talent-directory'");
    expect(source).toContain('shownCount} of ${matchedCount');

    // The section-level empty state waits for both sources, and a profile card never claims a fare.
    expect(source).toContain('{matchedCount === 0 && !loading && !error && (');
    const directoryMarkup = source.slice(directoryStart, servicesStart);
    expect(directoryMarkup).not.toContain('formatRate');
    expect(directoryMarkup).not.toContain('pricePaisa');
    expect(directoryMarkup).toContain("className='mw-talent-grid'");
    expect(stylesheet()).toContain('.mw-talent-directory{');
    expect(stylesheet()).toContain('.mw-talent-directory-empty{');
  });

  it('makes the whole talent card open that profile, not only the name text', () => {
    const card = readFileSync(resolve(process.cwd(), 'src/components/mediaworld/talent/talent-card.tsx'), 'utf8');
    const css = stylesheet();

    // The card has exactly one anchor — the name — so its ::after overlay is what makes the photo,
    // the handle, the location and the empty space land on the same profile page.
    expect(card).toContain('const href = `/mediaworld/talent/${talent.username}`;');
    expect(card).toContain("<Link className='mw-talent-card-name' href={href}>{talent.name}</Link>");
    expect(card.match(/mw-talent-card-name/g)).toHaveLength(1);

    expect(css).toContain('.mw-talent-card{position:relative;');
    expect(css).toContain(".mw-talent-card-name::after{content:'';position:absolute;inset:0;border-radius:16px}");

    // The rental line inside a card is a second link, to the same profile; it stays above the overlay.
    expect(css).toContain('.mw-talent-card-listings{position:relative;z-index:1;');
  });

  it('tells a signed-out visitor that a profile opens behind sign-in', () => {
    const source = platform();

    expect(source).toContain('{!authenticated ? (');
    expect(source).toContain('প্রোফাইল খুলতে ও যোগাযোগের তথ্য দেখতে সাইন ইন করুন।');
    expect(source).toContain('Sign in to open a profile and see contact details.');
    // Overflow goes to the real browse page, not to a fake category query the browse cannot read.
    expect(source).toContain("<Link className='mw-talent-directory-more' href='/mediaworld/talent'>");
  });
});
