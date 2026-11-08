# Dashboard Dark Theme Refactor Design

## Goal

Replace the visually broken feed presentation with a polished, responsive TwingFace dark dashboard while preserving all existing authentication, profile, and post behavior.

## Current issue

The current dashboard has layered, conflicting feed CSS declarations and malformed icon character sequences. These cause overlapping text, inconsistent spacing, and unreliable desktop/mobile layout.

## Layout

### Navbar

Create `src/components/layout/navbar.tsx` as a reusable dark header. It contains a Twingface logo and rounded search field on the left, five centered navigation tabs (Home, Friends, Watch, Marketplace, Groups), and notification, messages, and profile controls on the right. The Home tab is visibly active. The search field is functional as a client-side input but does not introduce search backend behavior.

The palette is fixed to Facebook-style dark values: `#18191a` page background, `#242526` cards, `#3a3b3c` hover/surface input, `#2d88ff`/`#1877f2` accent, `#e4e6eb` primary text, `#b0b3b8` secondary text, `#8a8d91` muted text, and `#3e4042` dividers. Cards use 12px radius, pill inputs use full radius, and buttons use rounded-lg.

### Dashboard grid

The authenticated dashboard uses one source of layout styling and a three-column grid below the navbar:

- Desktop: left sidebar 25%, feed 50%, right sidebar 25%, constrained only by sensible reading widths.
- Tablet (768px–1200px): an icon-only/collapsible left sidebar and feed remain; the right sidebar is hidden.
- Mobile (under 768px): one feed column, compact header controls, hidden desktop sidebars, and a fixed bottom navigation bar.

The left sidebar includes the current authenticated user, a Twing AI NEW badge, requested navigation labels, shortcut links, footer links, and an existing secure logout control anchored toward the bottom. The center column includes stories, the existing functional post composer, and the existing functional feed. The right sidebar renders static, non-sensitive sponsored, friend-request (including mutual friend copy), birthday, and online-contact UI placeholders.

## Feed components

`story-rail.tsx` renders isolated story cards with separate labels—no overlapping text. The first is “Create story.” It is presentational only; it does not add persistence, uploads, or stories APIs.

`create-post-form.tsx` keeps the current `POST /api/posts` behavior and displays Live video, Photo/video, and Feeling/activity controls as visual placeholders. Only text posting remains enabled.

`post-card.tsx` receives existing safe post data and renders a dark rounded card with author avatar/fallback, author link, optional visual verified badge, time/global icon, options button, content, static interaction statistics, and non-functional Like, Comment, Share placeholders. It keeps sensitive data out of the UI and does not claim unsupported rich-media behavior.

## Styling

Tailwind utility classes are preferred for the new/refactored elements, using the requested dark palette: `bg-[#18191a]`, `bg-[#242526]`, `border-gray-800`, and `text-gray-200`. The obsolete feed CSS blocks will be removed and replaced only where a small global responsive rule is genuinely required. Icons use reliable inline text/SVG-safe characters to prevent encoding corruption.

## Safety and compatibility

- Dashboard remains server-protected through `getCurrentUser()`.
- No client-provided identity is trusted.
- The existing post API, profiles, logout, and session mechanisms are unchanged.
- No database schema, migration, dependency, media upload, friend-request, messaging, notification, or search backend changes are introduced.

## Verification

Add a dashboard component-boundary regression test where appropriate. Run the full test suite, `npm.cmd run lint`, and `npm.cmd run build`. Perform a local authenticated dashboard smoke check after restarting the production server.
