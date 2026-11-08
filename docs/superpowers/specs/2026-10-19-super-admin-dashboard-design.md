# Super Admin Dashboard Design

## Goal

Replace the unmounted, MediaWorld-only super-admin panel with a single protected
TwingFace operations dashboard at `/super_admin`. The dashboard must match the
provided dark reference aesthetic while staying inside the application's existing
authenticated shell. It is for platform operators, not regular users.

## Scope

- Add the protected `/super_admin` route and a dedicated dashboard component.
- Render the dashboard with a dark command-centre layout: admin top bar, grouped
  left navigation, responsive content panels, KPI cards, trends, module usage,
  quick access, recent activity, pending approvals and system health.
- Replace the old `MediaWorldAdminDashboard` as the Super Admin presentation;
  no normal-user dashboard, Marketplace, MediaWorld, OTT, Games, messaging, or
  database schema behaviour is changed.
- Keep all advertised platform modules visible in the navigation and quick-access
  grid. A module without a current model or management interface is clearly
  labelled `Coming soon` / `Not connected`, never given invented live totals.

## Authorization and Routing

1. The route calls `getCurrentUser()` server-side.
2. An unauthenticated visitor is redirected to `/login`.
3. An authenticated user without `SUPER_ADMIN` is redirected to `/dashboard`.
4. The page passes a restricted, display-only admin profile and aggregate
   dashboard data into a client-side interactive dashboard component.

## Live Data Contract

The server builds one typed dashboard view model using read-only Prisma queries.

| Dashboard data | Source | Notes |
| --- | --- | --- |
| Total users / recent users | `User` | total count and latest registrations |
| Online now / active users | `UserPresence` | count of `isOnline`; active is users whose `lastActiveAt` falls in the selected current 30-day window |
| Total posts / daily post series | `Post` | existing social feed records |
| Marketplace listings | `MarketplaceListing` | available and total listing counts |
| Games | `Game` | active catalog count and total recorded plays |
| Media World approvals | `MediaProfile` | pending / approved counts and most recent pending profiles |
| Recent activity | existing records | merge recent user, post, listing, game and media-profile events in descending timestamp order |

There is currently no persistent model for OTT views/revenue, orders, payments,
support tickets, reports, streaming health or real infrastructure health. These
areas render as non-clickable or disabled `Not connected` status rows rather than
pretending to have data.

The growth chart uses the last 30 calendar days. Each day includes real account
registrations and posts created. Empty days return zero values so the chart shape
is stable. A CSS/SVG chart is used rather than adding a chart dependency.

## UI Composition

### Admin shell

- A full-width dark surface distinct from the Facebook-style member shell.
- Header includes brand, admin panel label, responsive search affordance, date
  period indicator, utility buttons, and current admin identity.
- A collapsible mobile sidebar becomes a fixed 250px desktop rail.

### Navigation

Navigation is grouped as in the references: Analytics; User Management; Social
Platform; Messaging; Entertainment; Business & Marketplace; Trust & Safety; and
System & Operations. The dashboard item is selected. Entries with a supported
destination are real links; unsupported entries use an accessible disabled
`Coming soon` label.

### Dashboard content

- Six KPI cards show only real metrics: Total Users, Active Users, Online Now,
  Total Posts, Marketplace Listings, and Pending Approvals.
- The overview area contains a 30-day growth chart, a module usage breakdown
  based on current record counts, and a System Status card whose database state
  is derived from a successful page query; non-observable services are marked
  `Not connected`.
- Quick Access presents all major modules. Supported ones route to their existing
  feature or management destination; unavailable ones are visually muted with
  their availability state.
- Bottom panels present recent users, recent activity, current pending MediaWorld
  applications (with direct approve/reject controls reused from the existing
  protected API), and a database-driven catalogue summary.

## Interaction and Error Handling

- The global search field filters the on-page recent-users/activity/quick-access
  content only; it does not expose cross-user private data or claim a universal
  search endpoint.
- MediaWorld approval actions retain their existing API authorization and refresh
  their local panel state after successful completion. Failed actions render an
  inline error and retain the item.
- If an aggregate query fails, the page displays a scoped unavailable message in
  the impacted panel while preserving the rest of the admin shell; no fabricated
  fallback totals are used.
- All cards and side navigation meet keyboard focus and accessible button/link
  semantics. Small screens stack content in one column and expose the sidebar via
  a menu button.

## Files and Testing

Expected changed/new files:

- `src/app/(main)/super_admin/page.tsx` — protected server route and view-model query.
- `src/components/super-admin/super-admin-dashboard.tsx` — interactive shell,
  search, mobile navigation and approval controls.
- `src/components/super-admin/super-admin-dashboard.test.tsx` — layout/state
  source contracts and interaction coverage.
- `src/lib/super-admin-dashboard.ts` and test — pure aggregation/date/activity
  shaping helpers.
- `src/app/dashboard.css` — new `.super-admin-*` scoped styles only.
- Existing obsolete `src/components/mediaworld/mediaworld-admin-dashboard.tsx`
  is removed after the new route owns the admin presentation.

Verification will cover helper edge cases, route authorization branches, component
interactions, lint, TypeScript, and the project test suite. A browser pass will
verify desktop and mobile layout at `/super_admin` using an actual Super Admin
session.

## Non-goals

- Creating payment, order, OTT media, moderation, ticket, streaming or system
  monitoring backends.
- Altering end-user pages or data schemas.
- Displaying fake revenue, views, support or infrastructure measurements.
