import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const component = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8');

describe('dashboard visual contract', () => {
  it('uses the design-system surfaces consistently in feed components', () => {
    const postCard = component('src/components/posts/post-card.tsx');
    const postList = component('src/components/posts/post-list.tsx');

    expect(postCard).toContain('post-card surface');
    expect(postList).toContain('feed-list');
    expect(`${postCard}${postList}`).not.toContain('bg-[#242526]');
  });

  it('drops the invented story rail because no stories feature exists', () => {
    const feed = component('src/components/dashboard/dashboard-feed.tsx');

    expect(existsSync(resolve(process.cwd(), 'src/components/posts/story-rail.tsx'))).toBe(false);
    expect(feed).not.toContain('StoryRail');
  });

  it('keeps the reference navigation labels, icon-only top tabs, and no feed notice', () => {
    const navbar = component('src/components/dashboard/dashboard-navbar.tsx');
    const sidebar = component('src/components/dashboard/dashboard-sidebar.tsx');
    const feed = component('src/components/dashboard/dashboard-feed.tsx');
    const page = component('src/app/(main)/dashboard/page.tsx');

    expect(navbar).toContain("const tabs = ['Home', 'Watch', 'Marketplace', 'For Rent', 'Groups', 'Gaming'] as const");
    expect(navbar).toContain("Gaming: '/games'");
    expect(navbar).toContain("Watch: '/ott'");
    expect(navbar).toContain("'For Rent': '/for-rent'");
    expect(navbar).toContain('aria-label={tab}');
    expect(sidebar).toContain("label: 'Profile'");
    expect(sidebar).toContain('const profileLabel = user.name || user.username');
    expect(sidebar).not.toContain('Robin Mondol');
    expect(sidebar).not.toContain('Remote Job Bangladesh');
    expect(sidebar).toContain("label: 'Live streaming'");
    expect(sidebar).toContain("label: 'For Rent'");
    expect(feed).not.toContain('You are still in your personal Twingface feed');
    expect(page).toContain('app-shell');
    expect(page).toContain('dashboard-grid');
  });

  it('wires interactive dashboard affordances (menu logout, theme toggle, modal composer, contacts search)', () => {
    const navbar = component('src/components/dashboard/dashboard-navbar.tsx');
    const composer = component('src/components/posts/create-post-form.tsx');
    const rightRail = component('src/components/dashboard/dashboard-right-rail.tsx');
    const logout = component('src/app/(main)/dashboard/logout-button.tsx');
    const postCard = component('src/components/posts/post-card.tsx');

    expect(navbar).toContain('button-theme-toggle');
    expect(navbar).toContain('menu-profile');
    expect(navbar).toContain('LogoutButton');
    expect(composer).toContain('dialog-compose');
    expect(rightRail).toContain('input-contact-search');
    expect(logout).toContain('window.setTimeout(() => controller.abort(), 10_000)');
    expect(logout).toContain('if (!response.ok)');
    expect(logout).toContain("className='logout-error' role='alert'");
    expect(logout).toContain('finally');
    expect(rightRail).toContain("className='avatar-photo'");
    expect(postCard).toContain('button-like-');
    expect(postCard).toContain('button-comment-');
    expect(navbar).toContain('<MessageInbox viewerId={user.id} />');
  });

  it('uses the authenticated user profile image in marked navigation avatars with an initials fallback', () => {
    const navbar = component('src/components/dashboard/dashboard-navbar.tsx');
    const sidebar = component('src/components/dashboard/dashboard-sidebar.tsx');
    const auth = component('src/lib/auth.ts');

    expect(auth).toContain('profileImage: true');
    expect(navbar).toContain('profileImage?: string | null');
    expect(navbar).toContain('imageUrl ? <img');
    expect(sidebar).toContain('profileImage?: string | null');
    expect(sidebar).toContain('user.profileImage ?');
  });

  it('uses the saved profile image for composer and authored-post avatars', () => {
    const composer = component('src/components/posts/create-post-form.tsx');
    const dashboardFeed = component('src/components/dashboard/dashboard-feed.tsx');
    const profile = component('src/app/(main)/profile/page.tsx');
    const postCard = component('src/components/posts/post-card.tsx');

    expect(composer).toContain('profileImage?: string | null');
    expect(composer).toContain('profileImage ? <img');
    expect(dashboardFeed).toContain('profileImage?: string | null');
    expect(profile).toContain("profileImage={profile.profileImage}");
    expect(postCard).toContain('post.author.profileImage ? <img');
    expect(composer).toContain("className='avatar-photo'");
    expect(postCard).toContain("className='avatar-photo'");
  });

  it('passes the viewer image to comment avatars without replacing other users', () => {
    const list = component('src/components/posts/post-list.tsx');
    const postCard = component('src/components/posts/post-card.tsx');
    const singlePost = component('src/app/(main)/post/[id]/page.tsx');

    expect(list).toContain('viewer:');
    expect(list).toContain('viewer={viewer}');
    expect(postCard).toContain('viewer?: Viewer');
    expect(postCard).toContain('item.author.profileImage ? <img');
    expect(postCard).toContain('viewer?.profileImage ? <img');
    expect(singlePost).toContain("import { getCurrentUser } from '@/lib/auth'");
    expect(singlePost).toContain('viewer={viewer');
  });

  it('keeps the image post composer and post media in the dashboard design system', () => {
    const composer = component('src/components/posts/create-post-form.tsx');
    const postCard = component('src/components/posts/post-card.tsx');
    const css = component('src/app/dashboard.css');

    expect(composer).toContain("accept='image/jpeg,image/png,image/webp,image/gif'");
    expect(composer).toContain('input-post-image');
    expect(composer).toContain('button-remove-post-image');
    expect(composer).toContain('new FormData()');
    expect(postCard).toContain("import Image from 'next/image'");
    expect(postCard).toContain('post.imageUrl');
    expect(css).toContain('.compose-image-preview');
    expect(css).toContain('.post-image-media');
  });

  it('accepts a YouTube link and embeds only a parsed privacy-enhanced player URL', () => {
    const composer = component('src/components/posts/create-post-form.tsx');
    const postCard = component('src/components/posts/post-card.tsx');
    const css = component('src/app/dashboard.css');
    const youtube = component('src/lib/youtube.ts');

    expect(composer).toContain("type='url'");
    expect(composer).toContain('input-post-youtube-url');
    expect(composer).toContain("form.set('youtubeUrl', youtubeUrl.trim())");
    expect(postCard).toContain("getYouTubeEmbedUrl(post.youtubeUrl)");
    expect(postCard).toContain('post-youtube-media');
    expect(youtube).toContain('youtube-nocookie.com/embed/');
    expect(postCard).toContain("referrerPolicy='strict-origin-when-cross-origin'");
    expect(postCard).toContain('allowFullScreen');
    expect(postCard).not.toContain('src={post.youtubeUrl}');
    expect(css).toContain('.post-youtube-media');
    expect(css).toContain('aspect-ratio:16 / 9');
  });

  it('connects both feeling controls to an accessible picker and submits only a selected key', () => {
    const composer = component('src/components/posts/create-post-form.tsx');
    const picker = component('src/components/posts/feeling-activity-picker.tsx');

    expect(composer).toContain('button-composer-feeling');
    expect(composer).toContain("aria-label='Add a feeling'");
    expect(picker).toContain('dialog-feeling-activity');
    expect(composer).toContain("form.set('feelingActivity', selectedFeelingActivity)");
    expect(composer).toContain('button-clear-feeling-activity');
    expect(picker).toContain('input-feeling-activity-search');
    expect(picker).toContain('button-feeling-activity-option-');
    expect(picker).toContain('aria-pressed={option.key === value}');
    expect(picker).toContain("event.key === 'Escape'");
  });

  it('renders recognized feeling metadata through the shared catalog and scoped styles', () => {
    const postCard = component('src/components/posts/post-card.tsx');
    const css = component('src/app/dashboard.css');

    expect(postCard).toContain("getFeelingActivity(post.feelingActivity)");
    expect(postCard).toContain('post-feeling-activity');
    expect(css).toContain('.feeling-activity-dialog');
    expect(css).toContain('.feeling-activity-chip');
    expect(css).toContain('.post-feeling-activity');
  });

  it('loads and submits persisted comments instead of changing only a local counter', () => {
    const postCard = component('src/components/posts/post-card.tsx');
    const css = component('src/app/dashboard.css');

    expect(postCard).toContain('/comments');
    expect(postCard).toContain("method: 'POST'");
    expect(postCard).toContain("headers: { 'Content-Type': 'application/json' }");
    expect(postCard).toContain('post._count.comments');
    expect(postCard).toContain('comment-pending');
    expect(postCard).toContain('comment-list');
    expect(css).toContain('.comment-list');
    expect(css).toContain('.comment-error');
  });

  it('keeps editable profile intro and real profile photo presentation scoped to the profile design system', () => {
    const intro = component('src/app/(main)/profile/profile-intro.tsx');
    const photos = component('src/app/(main)/profile/profile-photos.tsx');
    const css = component('src/app/dashboard.css');

    expect(intro).toContain('button-edit-bio');
    expect(intro).toContain('button-edit-details');
    expect(intro).toContain('dialog-edit-bio');
    expect(intro).toContain('dialog-edit-details');
    expect(photos).toContain("import Image from 'next/image'");
    expect(photos).toContain('fb-photo-image');
    expect(photos).toContain('fb-photo-empty');
    expect(css).toContain('.fb-intro-dialog');
    expect(css).toContain('.fb-photo-image');
  });

  it('renders a dynamic notification bell with a sound on/off toggle instead of a hardcoded badge', () => {
    const navbar = component('src/components/dashboard/dashboard-navbar.tsx');
    const bell = component('src/components/dashboard/notification-bell.tsx');
    const css = component('src/app/dashboard.css');

    // The navbar wires in the dynamic bell and no longer shows a static "3".
    expect(navbar).toContain('<NotificationBell />');
    expect(navbar).not.toContain('min-w-4');

    // The bell fetches a live count, opens a dropdown, and toggles sound.
    expect(bell).toContain('/api/notifications');
    expect(bell).toContain('/api/notifications/stream');
    expect(bell).toContain('new EventSource(');
    expect(bell).toContain('data-testid=\'button-notifications\'');
    expect(bell).toContain('data-testid=\'panel-notifications\'');
    expect(bell).toContain('data-testid=\'button-toggle-notification-sound\'');
    expect(bell).toContain('data-testid=\'text-notification-badge\'');
    expect(bell).toContain('playNotificationSound()');
    expect(bell).toContain('writeNotificationSoundPreference(');
    expect(bell).toContain('SpeakerOnIcon');
    expect(bell).toContain('SpeakerOffIcon');
    expect(bell).toContain("incoming.type === 'MESSAGE'");

    // Scoped styles exist for the panel, badge, and items.
    expect(css).toContain('.notification-panel');
    expect(css).toContain('.notification-badge');
    expect(css).toContain('.notification-item');
  });

  it('keeps direct messages in a dedicated inbox with its own unread badge and sound toggle', () => {
    const navbar = component('src/components/dashboard/dashboard-navbar.tsx');
    const inbox = component('src/components/dashboard/message-inbox.tsx');
    const css = component('src/app/dashboard.css');

    expect(navbar).toContain('<MessageInbox viewerId={user.id} />');
    expect(inbox).toContain('/api/conversations');
    expect(inbox).toContain('/api/messages/stream');
    expect(inbox).toContain('data-testid=\'button-messages\'');
    expect(inbox).toContain('data-testid=\'panel-messages\'');
    expect(inbox).toContain('button-toggle-message-sound');
    expect(inbox).toContain('playMessageSound()');
    expect(inbox).toContain('writeMessageSoundPreference(');
    expect(css).toContain('.message-inbox-panel');
    expect(css).toContain('.message-inbox-item');
  });

  it('wires WebRTC audio and video calling through the messenger chat window', () => {
    const chatWindow = component('src/components/messages/chat-window.tsx');
    const callContext = component('src/components/messages/call-context.tsx');
    const callOverlay = component('src/components/messages/call-overlay.tsx');
    const signalRoute = component('src/app/api/calls/signal/route.ts');
    const streamRoute = component('src/app/api/calls/stream/route.ts');
    const css = component('src/app/dashboard.css');

    // The chat header buttons start an audio and a video call.
    expect(chatWindow).toContain('useCall');
    expect(chatWindow).toContain("startCall(friend, 'audio')");
    expect(chatWindow).toContain("startCall(friend, 'video')");
    expect(chatWindow).toContain('button-voice-call');
    expect(chatWindow).toContain('button-video-call');

    // The context owns the RTCPeerConnection + getUserMedia handshake.
    expect(callContext).toContain('new RTCPeerConnection(');
    expect(callContext).toContain('getUserMedia');
    expect(callContext).toContain('createOffer');
    expect(callContext).toContain('createAnswer');
    expect(callContext).toContain('addIceCandidate');
    expect(callContext).toContain("new EventSource('/api/calls/stream')");
    expect(callContext).toContain('export function useCall');

    // Ending a call resets to idle after a brief delay so the overlay closes.
    expect(callContext).toContain("state.status !== 'ended'");
    expect(callContext).toContain('setState(initial)');

    // The overlay exposes accept/decline/end/mute/camera controls.
    expect(callOverlay).toContain('button-accept-call');
    expect(callOverlay).toContain('button-reject-call');
    expect(callOverlay).toContain('button-end-call');
    expect(callOverlay).toContain('button-toggle-mic');
    expect(callOverlay).toContain('button-toggle-camera');
    expect(callOverlay).toContain('call-remote-video');
    expect(callOverlay).toContain('call-local-video');

    // The signalling relay authenticates, enforces friendship, and forwards SDP/ICE.
    expect(signalRoute).toContain('getCurrentUser');
    expect(signalRoute).toContain("status !== 'ACCEPTED'");
    expect(signalRoute).toContain('publishCallSignal');
    expect(signalRoute).toContain('call-offer');
    expect(streamRoute).toContain('subscribe(user.id');
    expect(streamRoute).toContain("event.type.startsWith('call-')");

    // Scoped styles exist for the overlay.
    expect(css).toContain('.call-overlay');
    expect(css).toContain('.call-controls');
  });

  it('provides a secure Marketplace navigation, form, gallery, and inquiry flow', () => {
    const navbar = component('src/components/dashboard/dashboard-navbar.tsx');
    const sidebar = component('src/components/dashboard/dashboard-sidebar.tsx');
    const browser = component('src/components/marketplace/marketplace-browser.tsx');
    const form = component('src/components/marketplace/marketplace-form.tsx');
    const inquiry = component('src/components/marketplace/marketplace-inquiry.tsx');
    const gallery = component('src/components/marketplace/marketplace-gallery.tsx');
    const css = component('src/app/dashboard.css');

    expect(navbar).toContain("Marketplace: '/marketplace'");
    expect(sidebar).toContain("href: '/marketplace'");
    expect(sidebar).toContain("<a key={item.key} href={item.href ?? '/profile'}");
    expect(browser).toContain('/api/marketplace');
    expect(browser).toContain('Search marketplace');
    expect(form).toContain('new FormData(');
    expect(form).toContain("accept='image/jpeg,image/png,image/webp,image/gif'");
    expect(form).toContain('MAX_MARKETPLACE_IMAGES');
    expect(inquiry).toContain('Is this available?');
    expect(inquiry).toContain('/message');
    expect(gallery).toContain('marketplace-gallery');
    expect(css).toContain('.marketplace-grid');
    expect(css).toContain('.marketplace-gallery');
  });
});
