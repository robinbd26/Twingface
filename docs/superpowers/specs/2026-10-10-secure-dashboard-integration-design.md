# Secure Dashboard Integration Design

## Goal

Recreate the supplied Twingface reference dashboard as maintainable Next.js components while retaining the application’s real session, profile, logout, and post systems.

## Architecture

`/dashboard` remains a server component. It calls `getCurrentUser()` and redirects unauthenticated visitors to `/login`; it reads posts through the existing explicit safe Prisma projection. It passes only serializable safe data into client components.

The dashboard is divided into:

- `DashboardNavbar`: a client component for visual theme preference, local search text, visual menu/profile controls, and responsive navigation. Theme preference is the only localStorage value and contains no sensitive data.
- `DashboardSidebar`: server-rendered navigation/profile links and the existing client `LogoutButton`.
- `DashboardFeed`: client coordinator that receives server-fetched safe posts, applies local filtering to those posts, passes the result to the existing list, and refreshes after a real post is created.
- `DashboardRightRail`: static presentational widgets that do not claim to create friend relationships, notifications, messages, or sponsored content.

## Backend and security

No backend contract changes are needed. The existing `GET /api/posts` cursor feed and protected `POST /api/posts` endpoints continue to supply the feed. Search filters only data already delivered to the authenticated dashboard; no new search endpoint is created. Existing safe post selections continue to exclude password hashes, tokens, sessions, email, and other sensitive fields.

The session cookie remains HTTP-only and server checks remain the source of authorization. Client state must not decide dashboard access, post ownership, or logout validity.

## Reference design adaptation

The layout uses the reference’s dark top navigation, three-column desktop grid, stories, composer, post cards, sponsored content, and contacts styling. Functionality supported by no current model—friends, messages, notifications, groups, marketplace, story creation, media uploads, and reactions/comments/shares—remains clearly visual-only or links to existing pages only.

At desktop width all three rails render; at tablet width the right rail hides and navigation condenses; at mobile width both side rails hide and bottom navigation remains accessible.

## Testing and verification

Tests must cover unauthenticated redirect, authenticated dashboard data composition, absence of server-to-client function props, search filtering of safe post data, and existing post/authentication regressions. Run the full test suite, lint, and production build. A local authenticated HTTP/browser smoke check must confirm the dashboard, post composer, search filter, profile menu, logout, and protected-route redirect behavior.
